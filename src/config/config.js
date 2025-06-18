// API 서버 URL
export const SERVER_URL = process.env.REACT_APP_SERVER_URL || "";

// Azure Storage 설정
export const AZURE_CONFIG = {
  accountName: "",
  accountKey: "",
  containerName: "",
};

// 애플리케이션 설정
export const APP_CONFIG = {
  // 애플리케이션 상태
  APPLICATION_STATUS: {
    pending: {
      label: "신청중",
      next_statuses: ["processing", "rejected"],
      color: "#ecc94b",
    },
    processing: {
      label: "처리중",
      next_statuses: ["approved", "rejected"],
      color: "#4299e1",
    },
    approved: {
      label: "승인됨",
      next_statuses: [],
      color: "#48bb78",
    },
    rejected: {
      label: "반려됨",
      next_statuses: ["pending"],
      color: "#f56565",
    },
  },
};
