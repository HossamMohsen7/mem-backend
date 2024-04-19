import { User } from "@prisma/client";

export const userModel = (user: User) => {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    username: user.username,
    type: user.type,
    profilePictureUrl: user.profilePictureUrl,
  };
};
