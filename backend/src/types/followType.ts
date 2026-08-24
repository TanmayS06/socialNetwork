// union literal type untuk menentukan siapa yang termasuk followers dan following
export type FollowQueryType = "followers" | "following";

// representasi user database
export type UserDbModel = {
  id: number;
  username: string;
  full_name: string;
  photo_profile: string | null;
};

// versi user yang dikirim ke client (API/Socket)
export type UserResponse = {
  id: string;
  username: string;
  name: string;
  avatar: string;
};

// user response + status follow
export type FollowerResponse = UserResponse & {
  is_following: boolean;
};

// input untuk services untum mengambil list follow
export type GetFollowListInput = {
  userId: number;
  type: FollowQueryType;
};

// input aksi follow/unfollow
export type FollowUserInput = { userId: number; targetUserId: number };
export type UnfollowUserInput = { userId: number; targetUserId: number };

// discriminate union untuk hasil aksi
export type FollowActionResult =
  | { success: true; reason?: never }
  | { success: false; reason: "USER_NOT_FOUND" };

// payload untuk websocket (realtime follow/unfollow)
export type SocketFollowChangedPayload = {
  followerId: number;
  targetUserId: number;
  isFollowing: boolean;
  followerUser?: UserResponse;
  targetUser?: UserResponse;
};

export type GetFollowListForUserInput = {
  targetUserId: number;
  viewerUserId: number;
  type: FollowQueryType; // "followers" | "following"
};

export type GetFollowListForUserServiceInput = {
  targetUserId: number;
  viewerUserId: number;
  type: FollowQueryType;
};