output "api_url" {
  description = "API Gateway endpoint URL"
  value       = aws_apigatewayv2_api.http.api_endpoint
}

output "amplify_app_url" {
  description = "Amplify default domain"
  value       = "https://main.${aws_amplify_app.frontend.default_domain}"
}

output "lambda_function_name" {
  description = "Lambda function name (for CI/CD deploys)"
  value       = aws_lambda_function.api.function_name
}
