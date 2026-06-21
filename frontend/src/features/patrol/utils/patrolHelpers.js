/**
 * Gom nhóm tài sản phẳng từ Backend theo elder_id
 */
export const groupAssetsByElder = (assets = []) => {
  const groupedData = [];
  const elderGroups = {};
  
  assets.forEach(asset => {
    if (asset.elder_id) {
      if (!elderGroups[asset.elder_id]) {
        elderGroups[asset.elder_id] = {
          title: `Cụ: ${asset.elder_name || `ID ${asset.elder_id}`}`,
          isElder: true,
          assets: []
        };
      }
      elderGroups[asset.elder_id].assets.push(asset);
    }
  });
  
  Object.values(elderGroups).forEach(group => groupedData.push(group));

  const commonAssets = assets.filter(a => !a.elder_id);
  if (commonAssets.length > 0) {
    groupedData.push({
      title: "Tài sản chung của phòng",
      isElder: false,
      assets: commonAssets
    });
  }

  return groupedData;
};

export const getFinalStatus = (asset, uploadStatus = {}) => {
  const localStatus = uploadStatus[asset.asset_id];
  const dbStatus = asset.current_status;

  if (localStatus === 'processing') return 'Processing';
  if (localStatus === 'success') return 'Success';
  if (localStatus === 'missing') return 'Missing';
  if (localStatus === 'error') return 'Error';

  if (dbStatus === 'Xanh' || dbStatus === 'Success') return 'Success';
  if (dbStatus === 'Vang' || dbStatus === 'Vàng' || dbStatus === 'Missing') return 'Missing';
  if (dbStatus === 'Loi_Upload' || dbStatus === 'Error') return 'Error';
  if (dbStatus === 'Dang_Xu_Ly') return 'Processing';

  return 'Unchecked';
};

export const STATUS_SEARCH_KEYWORDS = {
  Success: ['đã nộp'],
  Missing: ['đã báo mất', 'báo mất', 'mất'],
  Processing: ['đang nén', 'đang xử lý'],
  Error: ['lỗi'],
  Unchecked: ['chưa kiểm kê', 'chưa'],
};