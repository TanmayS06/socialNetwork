import api from "@/lib/api";
import type { GetFollowersRes, GetSuggestedRes, FollowActionRes, GetFollowListRes } from "@/Types/follows";

export const followsApi = {
  followers: async () =>
    (await api.get<GetFollowersRes>("/follows?type=followers")).data,

  following: async () =>
    (await api.get<GetFollowersRes>("/follows?type=following")).data,

  suggested: async (limit = 5) =>
    (await api.get<GetSuggestedRes>(`/follows/suggested?limit=${limit}`)).data,

  follow: async (followed_user_id: number) =>
    (await api.post<FollowActionRes>("/follows", { followed_user_id })).data,

  unfollow: async (followed_user_id: number) =>
    (await api.delete<FollowActionRes>("/follows", { data: { followed_user_id } })).data,

  followersByUserId: async (userId: string | number) =>
    (await api.get<GetFollowersRes>(`/follows/user/${userId}?type=followers`)).data,

  followingByUserId: async (userId: string | number) =>
    (await api.get<GetFollowersRes>(`/follows/user/${userId}?type=following`)).data,
};

export async function getUserFollowList(userId: string | number, type: "followers" | "following") {
  const res = await api.get<GetFollowListRes>(`/follows/user/${userId}`, {
    params: { type },
    withCredentials: true,
  });
  return res.data;
}
