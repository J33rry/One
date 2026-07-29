export class ApiError extends Error {
    public code?: string;
    public status: number;

    constructor(message: string, status: number, code?: string) {
        super(message);
        this.name = "ApiError";
        this.status = status;
        this.code = code;
    }
}

export const API_BASE_URL =
    process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002/api/v1";

export async function apiClient<T>(
    endpoint: string,
    { headers, ...customConfig }: RequestInit = {},
): Promise<T> {
    const config: RequestInit = {
        method: customConfig.method || "GET",
        ...customConfig,
        headers: {
            "Content-Type": "application/json",
            ...headers,
        },
        // Required for sending/receiving the connect.sid session cookie
        credentials: "include",
    };

    // If the body is FormData, don't set Content-Type so the browser can set it with the boundary
    if (customConfig.body instanceof FormData) {
        const newHeaders = new Headers(config.headers);
        newHeaders.delete("Content-Type");
        config.headers = newHeaders;
    }

    let response: Response;
    try {
        response = await fetch(`${API_BASE_URL}${endpoint}`, config);
    } catch {
        throw new ApiError(
            "Network Error: Could not connect to the server.",
            0,
        );
    }

    // Handle empty responses (like 204 No Content)
    if (response.status === 204) {
        return {} as T;
    }

    let data;
    try {
        data = await response.json();
    } catch {
        // Some routes might return plain text or empty bodies despite not being 204
        data = {};
    }

    if (!response.ok) {
        // The backend uses a structured { error: { code, message } } format via errorHandler.js
        const message =
            data?.error?.message ||
            data?.message ||
            "An error occurred while communicating with the server.";
        const code = data?.error?.code || data?.code || "UNKNOWN_ERROR";
        throw new ApiError(message, response.status, code);
    }

    return data as T;
}
