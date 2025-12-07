import http from "http";

export interface HttpClientOptions {
  host: string;
  port: number;
}

export class HttpClient {
  constructor(private options: HttpClientOptions) {}

  getJson<T>(path: string): Promise<T> {
    const { host, port } = this.options;

    return new Promise<T>((resolve, reject) => {
      const req = http.request(
        {
          host,
          port,
          path,
          method: "GET",
          headers: {
            "Accept": "application/json"
          }
        },
        (res) => {
          const statusCode = res.statusCode ?? 0;

          if (statusCode < 200 || statusCode >= 300) {
            reject(new Error(`HTTP ${statusCode} for GET ${path}`));
            return;
          }

          const chunks: Buffer[] = [];

          res.on("data", (chunk: Buffer) => {
            chunks.push(chunk);
          });

          res.on("end", () => {
            try {
              const body = Buffer.concat(chunks).toString("utf8");
              const json = JSON.parse(body) as T;
              resolve(json);
            } catch (err) {
              reject(err);
            }
          });
        }
      );

      req.on("error", (err) => reject(err));
      req.end();
    });
  }
}
