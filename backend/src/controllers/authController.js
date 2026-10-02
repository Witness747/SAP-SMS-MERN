const User = require('../models/User');
const NotificationPreference = require('../models/NotificationPreference');
const generateToken = require('../utils/generateToken');
const { successResponse, errorResponse } = require('../utils/responseHandler');
const { validateRegister, validateLogin } = require('../validators');

/**
 * @desc    Register a new student
 * @route   POST /api/auth/register
 * @access  Public
 */
const register = async (req, res, next) => {
  try {
    const validationErrors = validateRegister(req.body);
    if (validationErrors.length > 0) {
      return errorResponse(res, 400, 'Validation failed', validationErrors);
    }

    const { name, email, password, studentId, department, semester, institution } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return errorResponse(res, 409, 'An account with this email address already exists.');
    }

    // Hash password safely
    const passwordHash = await User.hashPassword(password);

    // Create user document
    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      passwordHash,
      profile: {
        studentId: studentId ? studentId.trim() : '',
        department: department ? department.trim() : '',
        semester: semester ? semester.trim() : '',
        institution: institution ? institution.trim() : '',
      },
    });

    // Initialize default notification preferences
    await NotificationPreference.create({
      user: user._id,
    });

    // Generate JWT
    const token = generateToken(user._id);

    return successResponse(
      res,
      201,
      'Registration successful',
      {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          profile: user.profile,
          createdAt: user.createdAt,
        },
        token,
      }
    );
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Authenticate student and get token
 * @route   POST /api/auth/login
 * @access  Public
 */
const login = async (req, res, next) => {
  try {
    const validationErrors = validateLogin(req.body);
    if (validationErrors.length > 0) {
      return errorResponse(res, 400, 'Validation failed', validationErrors);
    }

    const { email, password } = req.body;

    // Find user by email
    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return errorResponse(res, 401, 'Invalid email or password.');
    }

    // Verify password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return errorResponse(res, 401, 'Invalid email or password.');
    }

    const token = generateToken(user._id);

    return successResponse(
      res,
      200,
      'Login successful',
      {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          profile: user.profile,
          createdAt: user.createdAt,
        },
        token,
      }
    );
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get current logged in student profile
 * @route   GET /api/auth/me
 * @access  Private
 */
const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select('-passwordHash');
    if (!user) {
      return errorResponse(res, 404, 'User not found');
    }

    return successResponse(res, 200, 'Profile fetched successfully', { user });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update current student profile details
 * @route   PUT /api/auth/profile
 * @access  Private
 */
const updateProfile = async (req, res, next) => {
  try {
    const { name, studentId, department, semester, institution, phone, avatar } = req.body;

    const user = await User.findById(req.user._id);
    if (!user) {
      return errorResponse(res, 404, 'User not found');
    }

    if (name) user.name = name.trim();
    if (studentId !== undefined) user.profile.studentId = studentId.trim();
    if (department !== undefined) user.profile.department = department.trim();
    if (semester !== undefined) user.profile.semester = semester.trim();
    if (institution !== undefined) user.profile.institution = institution.trim();
    if (phone !== undefined) user.profile.phone = phone.trim();
    if (avatar !== undefined) user.profile.avatar = avatar;

    await user.save();

    return successResponse(res, 200, 'Profile updated successfully', {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        profile: user.profile,
        updatedAt: user.updatedAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Change password
 * @route   PUT /api/auth/change-password
 * @access  Private
 */
const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return errorResponse(res, 400, 'Both current password and new password are required');
    }

    if (newPassword.length < 6) {
      return errorResponse(res, 400, 'New password must be at least 6 characters long');
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return errorResponse(res, 404, 'User not found');
    }

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return errorResponse(res, 400, 'Incorrect current password');
    }

    user.passwordHash = await User.hashPassword(newPassword);
    await user.save();

    return successResponse(res, 200, 'Password changed successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Logout (stateless JWT acknowledgment)
 * @route   POST /api/auth/logout
 * @access  Private
 */
const logout = async (req, res) => {
  return successResponse(res, 200, 'Logged out successfully');
};

module.exports = {
  register,
  login,
  getMe,
  updateProfile,
  changePassword,
  logout,
};
