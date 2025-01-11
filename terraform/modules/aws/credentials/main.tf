resource "aws_iam_user" "postrix" {
  name = "postrix"
}

resource "aws_iam_user_policy_attachment" "admin" {
  user       = aws_iam_user.postrix.name
  policy_arn = "arn:aws:iam::aws:policy/AdministratorAccess"
}

resource "aws_iam_access_key" "postrix" {
  user    = aws_iam_user.postrix.name
  status  = "Active"
}