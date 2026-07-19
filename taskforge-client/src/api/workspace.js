import api from './axios';

export const workspaceApi = {
  async list() {
    const { data } = await api.get('/workspaces');
    return data.workspaces;
  },
  async create({ name, description }) {
    const { data } = await api.post('/workspaces', { name, description });
    return data.workspace;
  },
  async get(workspaceId) {
    const { data } = await api.get(`/workspaces/${workspaceId}`);
    return data.workspace;
  },
  async inviteMember(workspaceId, { email, role }) {
    const { data } = await api.post(`/workspaces/${workspaceId}/members`, { email, role });
    return data.workspace;
  },
};

export const boardApi = {
  async list(workspaceId) {
    const { data } = await api.get(`/workspaces/${workspaceId}/boards`);
    return data.boards;
  },
  async create(workspaceId, { title, description, background }) {
    const { data } = await api.post(`/workspaces/${workspaceId}/boards`, { title, description, background });
    return data; // { board, lists }
  },
  async get(boardId) {
    const { data } = await api.get(`/boards/${boardId}`);
    return data; // { board, lists } — lists carry nested tasks
  },
};

export const taskApi = {
  async create(boardId, { title, listId, description, priority, dueDate }) {
    const { data } = await api.post(`/boards/${boardId}/tasks`, {
      title,
      listId,
      description,
      priority,
      dueDate,
    });
    return data.task;
  },
  async update(taskId, updates) {
    const { data } = await api.patch(`/tasks/${taskId}`, updates);
    return data.task;
  },
  async remove(taskId) {
    await api.delete(`/tasks/${taskId}`);
  },
};
