variable "aws_region" {
  description = "AWS region to deploy to"
  type        = string
  default     = "us-east-1"
}

variable "project_name" {
  description = "Project name used for resource naming and tagging"
  type        = string
  default     = "pitchpulse26"
}

variable "jwt_secret" {
  description = "JWT signing secret for authentication"
  type        = string
  sensitive   = true
}

variable "database_url" {
  description = "Neon PostgreSQL connection string"
  type        = string
  sensitive   = true
}

variable "lambda_zip_path" {
  description = "Path to the Lambda deployment zip"
  type        = string
  default     = "../dist/lambda.zip"
}

variable "cors_origin" {
  description = "Allowed CORS origin (Amplify URL once deployed)"
  type        = string
  default     = "*"
}

variable "github_repo_url" {
  description = "GitHub repository URL for Amplify"
  type        = string
  default     = "https://github.com/gerardinhoo/PitchPulse26"
}

variable "github_token" {
  description = "GitHub personal access token for Amplify to access the repo"
  type        = string
  sensitive   = true
}

variable "email_domain" {
  description = "Root domain to verify in SES (used as the sender domain)"
  type        = string
  default     = "pitchpulse26.com"
}

variable "email_from" {
  description = "From address used for transactional email (must live under email_domain)"
  type        = string
  default     = "no-reply@pitchpulse26.com"
}
