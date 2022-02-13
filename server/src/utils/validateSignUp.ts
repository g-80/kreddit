import { UsernamePasswordInput } from "../resolvers/UsernamePasswordInput";

export const validataSignUp = (options: UsernamePasswordInput) => {
  if (!options.email.includes("@") || options.email.includes(" ")) {
    return [
      {
        field: "email",
        message: "Invalid email",
      },
    ];
  }
  if (options.username.length <= 3) {
    return [
      {
        field: "username",
        message: "Username length must be at least 4",
      },
    ];
  }

  if (options.username.includes("@")) {
    return [
      {
        field: "username",
        message: "Username must not include an @",
      },
    ];
  }
  if (options.password.length <= 4) {
    return [
      {
        field: "password",
        message: "Password length must be at least 5",
      },
    ];
  }

  return null;
};
