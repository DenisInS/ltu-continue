import { IProtocol } from "core/protocol";
import { IMessenger, Message } from "core/protocol/messenger";
import net from "net";
import { v4 as uuidv4 } from "uuid";

export class TcpMessenger<
  ToProtocol extends IProtocol,
  FromProtocol extends IProtocol,
> implements IMessenger<ToProtocol, FromProtocol>
{
  //tcp服务器监听的端口和ip
  private port: number = 3000;
  private host: string = "127.0.0.1";
  private socket: net.Socket | null = null;

  //typeListeners：存储基于消息类型的监听器。
  //idListeners：存储基于消息 ID 的监听器，用于请求-响应模式。
  typeListeners = new Map<keyof ToProtocol, ((message: Message) => any)[]>();
  idListeners = new Map<string, (message: Message) => any>();

  //消息通过 JSON 格式在客户端和服务器之间传递。
  //支持消息的类型监听（on 方法）和请求-响应模式（request 方法）。
  constructor() {
    const server = net.createServer((socket) => {
      this.socket = socket;

      socket.on("connect", () => {
        console.log("Connected to server");
      });

      socket.on("data", (data: Buffer) => {
        this._handleData(data);
      });

      socket.on("end", () => {
        console.log("Disconnected from server");
      });

      socket.on("error", (err: any) => {
        console.error("Client error:", err);
      });
    });

    server.listen(this.port, this.host, () => {
      console.log(`Server listening on port ${this.port}`);
    });
  }

  private _onErrorHandlers: ((message: Message, error: Error) => void)[] = [];

  onError(handler: (message: Message, error: Error) => void) {
    this._onErrorHandlers.push(handler);
  }

  //异步消息处理：
  //通过异步迭代器处理消息响应的流式数据。
  //提供错误处理机制，用于处理消息处理中的异常。
  public async awaitConnection() {
    while (!this.socket) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  //消息分片与拼接：
  //处理 TCP 数据流中的可能分片（_handleData 方法）。
  //确保解析完整的 JSON 消息。
  private _handleLine(line: string) {
    try {
      const msg: Message = JSON.parse(line);
      if (msg.messageType === undefined || msg.messageId === undefined) {
        throw new Error("Invalid message sent: " + JSON.stringify(msg));
      }

      // Call handler and respond with return value
      const listeners = this.typeListeners.get(msg.messageType as any);
      listeners?.forEach(async (handler) => {
        try {
          const response = await handler(msg);
          if (
            response &&
            typeof response[Symbol.asyncIterator] === "function"
          ) {
            let next = await response.next();
            while (!next.done) {
              this.send(
                msg.messageType,
                {
                  done: false,
                  content: next.value,
                  status: "success",
                },
                msg.messageId,
              );
              next = await response.next();
            }
            this.send(
              msg.messageType,
              {
                done: true,
                content: next.value,
                status: "success",
              },
              msg.messageId,
            );
          } else {
            this.send(
              msg.messageType,
              {
                done: true,
                content: response,
                status: "success",
              },
              msg.messageId,
            );
          }
        } catch (e: any) {
          this.send(
            msg.messageType,
            { done: true, error: e.message, status: "error" },
            msg.messageId,
          );

          console.warn(`Error running handler for "${msg.messageType}": `, e);
          this._onErrorHandlers.forEach((handler) => {
            handler(msg, e);
          });
        }
      });

      // Call handler which is waiting for the response, nothing to return
      this.idListeners.get(msg.messageId)?.(msg);
    } catch (e) {
      let truncatedLine = line;
      if (line.length > 200) {
        truncatedLine =
          line.substring(0, 100) + "..." + line.substring(line.length - 100);
      }
      console.error("Error parsing line: ", truncatedLine, e);
      return;
    }
  }

  private _unfinishedLine: string | undefined = undefined;

  private _handleData(data: Buffer) {
    const d = data.toString();
    const lines = d.split(/\r\n/).filter((line) => line.trim() !== "");
    if (lines.length === 0) {
      return;
    }

    if (this._unfinishedLine) {
      lines[0] = this._unfinishedLine + lines[0];
      this._unfinishedLine = undefined;
    }
    if (!d.endsWith("\r\n")) {
      this._unfinishedLine = lines.pop();
    }
    lines.forEach((line) => this._handleLine(line));
  }

  send<T extends keyof FromProtocol>(
    messageType: T,
    data: FromProtocol[T][0],
    messageId?: string,
  ): string {
    messageId = messageId ?? uuidv4();
    const msg: Message = {
      messageType: messageType as string,
      data,
      messageId,
    };

    this.socket?.write(JSON.stringify(msg) + "\r\n");
    return messageId;
  }

  on<T extends keyof ToProtocol>(
    messageType: T,
    handler: (message: Message<ToProtocol[T][0]>) => ToProtocol[T][1],
  ): void {
    if (!this.typeListeners.has(messageType)) {
      this.typeListeners.set(messageType, []);
    }
    this.typeListeners.get(messageType)?.push(handler);
  }

  invoke<T extends keyof ToProtocol>(
    messageType: T,
    data: ToProtocol[T][0],
  ): ToProtocol[T][1] {
    return this.typeListeners.get(messageType)?.[0]?.({
      messageId: uuidv4(),
      messageType: messageType as string,
      data,
    });
  }

  request<T extends keyof FromProtocol>(
    messageType: T,
    data: FromProtocol[T][0],
  ): Promise<FromProtocol[T][1]> {
    const messageId = uuidv4();
    return new Promise((resolve) => {
      const handler = (msg: Message) => {
        resolve(msg.data);
        this.idListeners.delete(messageId);
      };
      this.idListeners.set(messageId, handler);
      this.send(messageType, data, messageId);
    });
  }
}
