require('dotenv').config({ path: __dirname + '/../.env' });
const mongoose = require('mongoose');
const User = require('../src/models/User');
const Subject = require('../src/models/Subject');
const Attendance = require('../src/models/Attendance');
const Task = require('../src/models/Task');
const Event = require('../src/models/Event');
const Timetable = require('../src/models/Timetable');
const NotificationPreference = require('../src/models/NotificationPreference');

const DEMO_EMAIL = 'student@sap-sms.demo';
const DEMO_PASSWORD = 'Password123!';

const seedData = async () => {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('❌ MONGODB_URI is not set. Please create backend/.env with your MongoDB Atlas URI.');
    process.exit(1);
  }

  try {
    console.log('Connecting to MongoDB Atlas for demo seeding...');
    await mongoose.connect(uri);
    console.log('✅ Connected to MongoDB.');

    const isReset = process.argv.includes('--reset');

    // Find or clean existing demo user
    let user = await User.findOne({ email: DEMO_EMAIL });
    if (user && isReset) {
      console.log('Cleaning existing demo student records...');
      await Subject.deleteMany({ user: user._id });
      await Attendance.deleteMany({ user: user._id });
      await Task.deleteMany({ user: user._id });
      await Event.deleteMany({ user: user._id });
      await Timetable.deleteMany({ user: user._id });
      await NotificationPreference.deleteMany({ user: user._id });
      await User.deleteOne({ _id: user._id });
      user = null;
    }

    if (!user) {
      console.log('Creating demo student user...');
      const passwordHash = await User.hashPassword(DEMO_PASSWORD);
      user = await User.create({
        name: 'Alex Johnson',
        email: DEMO_EMAIL,
        passwordHash,
        role: 'student',
        profile: {
          studentId: 'STU-2024-9481',
          department: 'Computer Science & Engineering',
          semester: '6th Semester',
          institution: 'Institute of Technology & Sciences',
          phone: '+1 (555) 234-5678',
        },
      });
      console.log(`✅ Demo user created: ${user.email}`);
    } else {
      console.log(`ℹ️ Demo user '${user.email}' already exists. Updating demo contents...`);
      await Subject.deleteMany({ user: user._id });
      await Attendance.deleteMany({ user: user._id });
      await Task.deleteMany({ user: user._id });
      await Event.deleteMany({ user: user._id });
      await Timetable.deleteMany({ user: user._id });
    }

    // 1. Seed Subjects
    console.log('Seeding academic subjects...');
    const subjectsData = [
      {
        user: user._id,
        name: 'Data Structures & Algorithms',
        code: 'CS201',
        instructor: 'Dr. Sarah Mitchell',
        credits: 4,
        targetAttendance: 75,
        color: '#3B82F6', // Blue
      },
      {
        user: user._id,
        name: 'Operating Systems',
        code: 'CS301',
        instructor: 'Prof. David Chen',
        credits: 4,
        targetAttendance: 80,
        color: '#10B981', // Emerald
      },
      {
        user: user._id,
        name: 'Database Management Systems',
        code: 'CS302',
        instructor: 'Dr. Emily Watson',
        credits: 3,
        targetAttendance: 75,
        color: '#8B5CF6', // Purple
      },
      {
        user: user._id,
        name: 'Computer Networks',
        code: 'CS303',
        instructor: 'Prof. Robert Taylor',
        credits: 3,
        targetAttendance: 75,
        color: '#F59E0B', // Amber
      },
      {
        user: user._id,
        name: 'Full-Stack Web Development',
        code: 'CS305',
        instructor: 'Dr. Anita Roy',
        credits: 3,
        targetAttendance: 70,
        color: '#EC4899', // Pink
      },
    ];

    const subjects = await Subject.insertMany(subjectsData);
    console.log(`✅ Seeded ${subjects.length} subjects.`);

    // 2. Seed Attendance records
    console.log('Seeding attendance figures...');
    const attendanceData = [
      {
        user: user._id,
        subject: subjects[0]._id, // DSA
        attendedClasses: 28,
        totalClasses: 32,
        targetPercentage: 75,
      },
      {
        user: user._id,
        subject: subjects[1]._id, // OS
        attendedClasses: 24,
        totalClasses: 34,
        targetPercentage: 80, // Currently ~70.59% (Warning state)
      },
      {
        user: user._id,
        subject: subjects[2]._id, // DBMS
        attendedClasses: 22,
        totalClasses: 25,
        targetPercentage: 75,
      },
      {
        user: user._id,
        subject: subjects[3]._id, // CN
        attendedClasses: 15,
        totalClasses: 22,
        targetPercentage: 75, // Currently ~68.18% (Warning state)
      },
      {
        user: user._id,
        subject: subjects[4]._id, // Web Dev
        attendedClasses: 27,
        totalClasses: 28,
        targetPercentage: 70,
      },
    ];

    await Attendance.insertMany(attendanceData);
    console.log(`✅ Seeded ${attendanceData.length} attendance records.`);

    // 3. Seed Timetable
    console.log('Seeding weekly schedule...');
    const timetableData = [
      // Monday
      { user: user._id, subject: subjects[0]._id, day: 'Monday', startTime: '09:00', endTime: '10:00', room: 'LH-101', type: 'lecture' },
      { user: user._id, subject: subjects[1]._id, day: 'Monday', startTime: '10:15', endTime: '11:15', room: 'LH-103', type: 'lecture' },
      { user: user._id, subject: subjects[4]._id, day: 'Monday', startTime: '11:30', endTime: '13:00', room: 'CS-Lab-2', type: 'lab' },

      // Tuesday
      { user: user._id, subject: subjects[2]._id, day: 'Tuesday', startTime: '09:00', endTime: '10:00', room: 'LH-201', type: 'lecture' },
      { user: user._id, subject: subjects[3]._id, day: 'Tuesday', startTime: '10:15', endTime: '11:15', room: 'LH-104', type: 'lecture' },
      { user: user._id, subject: subjects[0]._id, day: 'Tuesday', startTime: '14:00', endTime: '16:00', room: 'CS-Lab-1', type: 'lab' },

      // Wednesday
      { user: user._id, subject: subjects[1]._id, day: 'Wednesday', startTime: '09:00', endTime: '10:00', room: 'LH-103', type: 'lecture' },
      { user: user._id, subject: subjects[4]._id, day: 'Wednesday', startTime: '10:15', endTime: '11:15', room: 'LH-102', type: 'lecture' },
      { user: user._id, subject: subjects[2]._id, day: 'Wednesday', startTime: '11:30', endTime: '12:30', room: 'LH-201', type: 'tutorial' },

      // Thursday
      { user: user._id, subject: subjects[3]._id, day: 'Thursday', startTime: '09:00', endTime: '10:00', room: 'LH-104', type: 'lecture' },
      { user: user._id, subject: subjects[0]._id, day: 'Thursday', startTime: '10:15', endTime: '11:15', room: 'LH-101', type: 'lecture' },
      { user: user._id, subject: subjects[1]._id, day: 'Thursday', startTime: '14:00', endTime: '16:00', room: 'Sys-Lab', type: 'lab' },

      // Friday
      { user: user._id, subject: subjects[4]._id, day: 'Friday', startTime: '09:00', endTime: '10:00', room: 'LH-102', type: 'lecture' },
      { user: user._id, subject: subjects[2]._id, day: 'Friday', startTime: '10:15', endTime: '11:15', room: 'LH-201', type: 'lecture' },
      { user: user._id, subject: subjects[3]._id, day: 'Friday', startTime: '11:30', endTime: '13:00', room: 'Net-Lab', type: 'lab' },
    ];

    await Timetable.insertMany(timetableData);
    console.log(`✅ Seeded ${timetableData.length} timetable entries.`);

    // 4. Seed Tasks
    console.log('Seeding academic tasks...');
    const now = new Date();
    const tasksData = [
      {
        user: user._id,
        subject: subjects[0]._id, // DSA
        title: 'Implement Red-Black Tree in C++',
        description: 'Complete rotations and insertion rebalancing test suite.',
        dueDate: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000), // in 2 days
        priority: 'urgent',
        status: 'pending',
      },
      {
        user: user._id,
        subject: subjects[2]._id, // DBMS
        title: 'B+ Tree Indexing Research Paper Review',
        description: 'Summarize concurrency control mechanisms in secondary B+ indices.',
        dueDate: new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000), // in 4 days
        priority: 'high',
        status: 'in-progress',
      },
      {
        user: user._id,
        subject: subjects[4]._id, // Web Dev
        title: 'Build Express REST API with MongoDB validation',
        description: 'Define schemas, implement auth middleware, and test with Postman.',
        dueDate: new Date(now.getTime() + 6 * 24 * 60 * 60 * 1000), // in 6 days
        priority: 'medium',
        status: 'pending',
      },
      {
        user: user._id,
        subject: subjects[1]._id, // OS
        title: 'Process Synchronization Semaphore Assignment',
        description: 'Dining philosophers and producer-consumer implementations.',
        dueDate: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000), // 2 days ago (Overdue demo)
        priority: 'high',
        status: 'pending',
      },
      {
        user: user._id,
        subject: subjects[3]._id, // CN
        title: 'Wireshark Packet Analysis Lab Report',
        description: 'Analyze TCP 3-way handshake and HTTP/HTTPS headers.',
        dueDate: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
        priority: 'medium',
        status: 'completed',
        completionDate: new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000),
      },
    ];

    await Task.insertMany(tasksData);
    console.log(`✅ Seeded ${tasksData.length} tasks.`);

    // 5. Seed Events
    console.log('Seeding academic events...');
    const eventsData = [
      {
        user: user._id,
        title: 'Mid-Semester Examination: Data Structures',
        description: 'Covers Trees, Graphs, Sorting algorithms, and Dynamic Programming.',
        date: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000),
        time: '10:00 AM',
        location: 'Hall A - Exam Center',
        category: 'exam',
      },
      {
        user: user._id,
        title: 'Operating Systems Milestone Presentation',
        description: 'Present CPU scheduling algorithm simulator with benchmark analysis.',
        date: new Date(now.getTime() + 8 * 24 * 60 * 60 * 1000),
        time: '02:00 PM',
        location: 'Seminar Hall 3',
        category: 'presentation',
      },
      {
        user: user._id,
        title: 'Database Project Final Submission Deadline',
        description: 'Submit normalized schema, SQL dump, and application codebase.',
        date: new Date(now.getTime() + 12 * 24 * 60 * 60 * 1000),
        time: '11:59 PM',
        location: 'Online Portal',
        category: 'deadline',
      },
      {
        user: user._id,
        title: 'Guest Lecture: Modern Distributed Systems',
        description: 'Talk by industry lead architect on Kubernetes and Microservices.',
        date: new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000),
        time: '11:00 AM',
        location: 'Auditorium',
        category: 'meeting',
      },
    ];

    await Event.insertMany(eventsData);
    console.log(`✅ Seeded ${eventsData.length} events.`);

    // 6. Seed NotificationPreference
    await NotificationPreference.findOneAndUpdate(
      { user: user._id },
      {
        user: user._id,
        taskReminders: true,
        eventReminders: true,
        attendanceWarnings: true,
        timetableReminders: true,
      },
      { upsert: true }
    );
    console.log('✅ Configured notification preferences.');

    console.log('\n============================================================');
    console.log('🎉 DEMO DATA SEEDED SUCCESSFULLY!');
    console.log('You can now log in with the demo account:');
    console.log(`📧 Email:    ${DEMO_EMAIL}`);
    console.log(`🔑 Password: ${DEMO_PASSWORD}`);
    console.log('============================================================\n');

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error.message);
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    process.exit(1);
  }
};

seedData();
