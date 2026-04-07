import { UserModel } from "../models/user.model.js"

export const getUsers = (req, res) => {
  const users = UserModel.getAll()
  res.json(users)
}