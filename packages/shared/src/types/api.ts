export interface ApiResponse<T> {
  data: T
  success: true
}

export interface ApiError {
  success: false
  error: {
    code: string
    message: string
  }
}
