import { create } from 'zustand';


export const usePatrolStore = create((set) => ({
  // Trạng thái upload toàn cục: { [assetId]: 'processing' | 'success' | 'error' | 'missing' }
  uploadStatus: {},
  
  // Hàng đợi lưu trữ ID các task đang chạy ngầm
  activeUploadTasks: 0,

  setUploadStatus: (updater) => set((state) => {
    const newStatus = typeof updater === 'function' ? updater(state.uploadStatus) : updater;
    return { uploadStatus: { ...state.uploadStatus, ...newStatus } };
  }),

  incrementTask: () => set((state) => ({ activeUploadTasks: state.activeUploadTasks + 1 })),
  decrementTask: () => set((state) => ({ activeUploadTasks: Math.max(0, state.activeUploadTasks - 1) })),
}));