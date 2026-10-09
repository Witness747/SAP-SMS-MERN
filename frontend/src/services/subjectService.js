import api from './api';

export const subjectService = {
  getAll: async (params = {}) => {
    if (params.page !== undefined || params.pageSize !== undefined) {
      return await api.get('/subjects', { params: { pageSize: 100, ...params } });
    }

    // Existing selectors expect all subjects. Fetch the bounded API pages so
    // pagination does not silently hide subjects from task/timetable forms.
    const firstPage = await api.get('/subjects', { params: { page: 1, pageSize: 100 } });
    const totalPages = firstPage.meta?.pagination?.totalPages || 1;
    if (totalPages <= 1) return firstPage;

    const remainingPages = await Promise.all(
      Array.from({ length: totalPages - 1 }, (_, index) =>
        api.get('/subjects', { params: { page: index + 2, pageSize: 100 } })
      )
    );
    const allSubjects = [firstPage, ...remainingPages].flatMap((response) => response.data || []);
    return {
      ...firstPage,
      data: allSubjects,
      meta: { ...firstPage.meta, count: allSubjects.length },
    };
  },

  getById: async (id) => {
    return await api.get(`/subjects/${id}`);
  },

  create: async (subjectData) => {
    return await api.post('/subjects', subjectData);
  },

  update: async (id, subjectData) => {
    return await api.put(`/subjects/${id}`, subjectData);
  },

  delete: async (id) => {
    return await api.delete(`/subjects/${id}`);
  },
};
