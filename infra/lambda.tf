# ── IAM Role ──
data "aws_iam_policy_document" "lambda_assume" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "lambda" {
  name               = "${var.project_name}-lambda-role"
  assume_role_policy = data.aws_iam_policy_document.lambda_assume.json
}

resource "aws_iam_role_policy_attachment" "lambda_basic" {
  role       = aws_iam_role.lambda.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# Allow Lambda to read SSM parameters
data "aws_iam_policy_document" "lambda_ssm" {
  statement {
    actions = ["ssm:GetParameter", "ssm:GetParameters"]
    resources = [
      aws_ssm_parameter.jwt_secret.arn,
      aws_ssm_parameter.database_url.arn,
      aws_ssm_parameter.cors_origin.arn,
    ]
  }
}

resource "aws_iam_role_policy" "lambda_ssm" {
  name   = "${var.project_name}-lambda-ssm"
  role   = aws_iam_role.lambda.id
  policy = data.aws_iam_policy_document.lambda_ssm.json
}

# ── CloudWatch Log Group ──
resource "aws_cloudwatch_log_group" "lambda" {
  name              = "/aws/lambda/${var.project_name}-api"
  retention_in_days = 14
}

# ── S3 bucket for Lambda deployment artifacts ──
resource "aws_s3_bucket" "lambda_artifacts" {
  bucket = "${var.project_name}-lambda-artifacts"
}

resource "aws_s3_object" "lambda_zip" {
  bucket = aws_s3_bucket.lambda_artifacts.id
  key    = "lambda.zip"
  source = var.lambda_zip_path
  etag   = filemd5(var.lambda_zip_path)
}

# ── Lambda Function ──
resource "aws_lambda_function" "api" {
  function_name = "${var.project_name}-api"
  role          = aws_iam_role.lambda.arn
  handler       = "src/lambda.handler"
  runtime       = "nodejs22.x"
  timeout       = 30
  memory_size   = 256

  s3_bucket        = aws_s3_bucket.lambda_artifacts.id
  s3_key           = aws_s3_object.lambda_zip.key
  source_code_hash = filebase64sha256(var.lambda_zip_path)

  environment {
    variables = {
      NODE_ENV     = "production"
      JWT_SECRET   = aws_ssm_parameter.jwt_secret.value
      DATABASE_URL = aws_ssm_parameter.database_url.value
      CORS_ORIGIN  = aws_ssm_parameter.cors_origin.value
    }
  }

  depends_on = [
    aws_iam_role_policy_attachment.lambda_basic,
    aws_cloudwatch_log_group.lambda,
  ]
}
