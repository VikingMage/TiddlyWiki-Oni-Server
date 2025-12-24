import http from "http";

export interface HttpClientOptions {
  host: string;
  port: number;
}

export class HttpClient {
  constructor(private options: HttpClientOptions) {}

  getJson<T>(path: string): Promise<T> {
    return this.requestJson<T>("GET", path);
  }

  postJson<T>(path: string, body?: unknown): Promise<T> {
    return this.requestJson<T>("POST", path, body);
  }

  private requestJson<T>(method: "GET" | "POST", path: string, body?: unknown): Promise<T> {
    const { host, port } = this.options;

    return new Promise<T>((resolve, reject) => {
      const payload = body === undefined ? undefined : JSON.stringify(body);

      const req = http.request(
        {
          host,
          port,
          path,
          method,
          headers: {
            Accept: "application/json",
            ...(payload
              ? { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(payload) }
              : {})
          }
        },
        (res) => {
          const statusCode = res.statusCode ?? 0;
          const chunks: Buffer[] = [];

          res.on("data", (chunk: Buffer) => chunks.push(chunk));
          res.on("end", () => {
            const text = Buffer.concat(chunks).toString("utf8");

            if (statusCode < 200 || statusCode >= 300) {
              return reject(new Error(`HTTP ${statusCode} for ${method} ${path}: ${text}`));
            }

            try {
              resolve(JSON.parse(text) as T);
            } catch (err) {
              reject(err);
            }
          });
        }
      );

      req.on("error", reject);
      if (payload) req.write(payload);
      req.end();
    });
  }
}
