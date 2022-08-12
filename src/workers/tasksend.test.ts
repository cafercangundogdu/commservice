import { Customer } from "../customer";
import { HttpAPI, MessagePostData, PaymentResponse } from "../http";
import { Task } from "../task/task";
import { TaskQueue } from "../task/taskqueue";
import { TaskSendWorker, TaskSendWorkerOutputMessageType } from "./tasksend";

class MockHttpApi extends HttpAPI {
  private mockReturnData: PaymentResponse;
  private mockOnSocketOpen: () => void;
  constructor(
    endPointReturnType: PaymentResponse,
    mockOnSocketOpen: () => void
  ) {
    // TODO: create a map for other endpoints?
    super();
    this.mockReturnData = endPointReturnType;
    this.mockOnSocketOpen = mockOnSocketOpen;
  }

  checkPayment(
    data: MessagePostData,
    onSocketOpen?: (() => void | undefined) | undefined
  ): Promise<PaymentResponse> {
    return new Promise<PaymentResponse>((resolve, reject) => {
      if (onSocketOpen) {
        onSocketOpen();
      }
      if (this.mockOnSocketOpen) {
        this.mockOnSocketOpen();
      }
      if (this.mockReturnData) {
        resolve(this.mockReturnData);
      } else {
        reject();
      }
    });
  }
}

describe("Test Task Send worker", () => {
  // const nonPaidHttp = new MockHttpApi({ paid: false, status: 201 });
  // const failHttp = new MockHttpApi({ status: 500 });

  const taskTimeoutMs = 10000;

  it(
    "should work correctly",
    async () => {
      const taskQueue = new TaskQueue();

      let counter = 0;
      const paidHttp = new MockHttpApi({ paid: true, status: 201 }, () => {
        if (counter === 0) {
          // checking seconds
          expect(Math.floor(Date.now() / 1000)).toBe(
            Math.floor(taskQueue.getTimeMs() / 1000)
          );
        }
      });
      const taskSendWorker = new TaskSendWorker(paidHttp);

      const customers = [
        new Customer(
          "vdaybell0@seattletimes.com",
          "Hi Vincenty, your invoice about $1.99 is due.",
          "2s-4s-6s"
        ),
        new Customer(
          "esealove2@go.com",
          "Hola Elspeth, aun tienes un pago de $4.55 pendiente.",
          "0s-1s-3s"
        ),
      ];

      const tasks = Task.fromCustomers(...customers);

      for (const task of tasks) {
        taskQueue.queue(task);
      }

      taskSendWorker.on(
        "output",
        ({ data, type }: TaskSendWorkerOutputMessageType) => {
          if (type === "task_remove") {
            taskQueue.removeTasks(data as Task);
          } else if (type === "time_ms") {
            taskQueue.setTimeMs(data as number);
          } else {
            throw new Error("Test not implemented for this type!");
          }
        }
      );

      /*
      new Promise<void>((resolve, reject) => {
        setInterval(() => {
          if (taskQueue.queueSize() === 0) {
            resolve();
          }
          const task = taskQueue.dequeue();
          if (task) {
            taskSendWorker.send({
              task,
              absoluteTimeMs: taskQueue.getTaskAbsoluteTimeMs(task),
            });
          }
        }, 100);
      });
*/
      const workerPromise = taskSendWorker.run();

      const sendPromise = new Promise<void>(async (resolve) => {
        // we are ignoring tasks timing
        const queueList = taskQueue.getQueueList();
        for (const task of queueList) {
          taskSendWorker.send({
            task,
            absoluteTimeMs: Date.now(),
          });
        }
        resolve();
      });

      setTimeout(() => {
        taskSendWorker.emit("stop");
      }, taskTimeoutMs);

      await sendPromise;
      await workerPromise;
    },
    taskTimeoutMs + 1000
  );
});
