export type FollowUserItem = {
  id: string;
  username: string;
  name: string;
  avatar: string;
  is_following: boolean;
};

export type ApiSuccess<T> = { status: "success"; data: T };
export type ApiError = { status: "error"; message: string };

export type GetFollowersRes = ApiSuccess<{ followers: FollowUserItem[] }> | ApiError;
export type GetSuggestedRes = ApiSuccess<{ users: FollowUserItem[] }> | ApiError;
export type GetFollowListRes =
  | ApiSuccess<{ followers?: FollowUserItem[]; following?: FollowUserItem[] }>
  | ApiError;


export type FollowActionRes =
  | ApiSuccess<{ user_id: string; is_following: boolean }>
  | ApiError & { message: string };


export type GetFollowersResponse = {
  status: "success" | "error";
  data?: { followers: FollowUserItem[] };
  message?: string;
};

export type FollowActionResponse = {
  status: "success" | "error";
  message: string;
  data?: { user_id: string; is_following: boolean };
};