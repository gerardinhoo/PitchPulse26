# ── CI/CD IAM User ──
resource "aws_iam_user" "ci" {
  name = "${var.project_name}-ci"
}

resource "aws_iam_access_key" "ci" {
  user = aws_iam_user.ci.name
}

data "aws_iam_policy_document" "ci" {
  # Upload Lambda zip to S3
  statement {
    actions = ["s3:PutObject", "s3:GetObject"]
    resources = [
      "${aws_s3_bucket.lambda_artifacts.arn}/lambda.zip",
      "${aws_s3_bucket.lambda_artifacts.arn}/lambda-artifacts/*",
    ]
  }

  # Update Lambda function code
  statement {
    actions = [
      "lambda:UpdateFunctionCode",
      "lambda:GetFunction",
      "lambda:GetFunctionConfiguration",
    ]
    resources = [aws_lambda_function.api.arn]
  }
}

resource "aws_iam_user_policy" "ci" {
  name   = "${var.project_name}-ci-deploy"
  user   = aws_iam_user.ci.name
  policy = data.aws_iam_policy_document.ci.json
}
