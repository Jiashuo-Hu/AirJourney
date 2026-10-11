import type { State } from "./types";
export type StateMutation = (latest: State) => State;

// Compute each change only when its turn starts, against the last successful save.
export function serialMutations(
  read: () => State | null,
  write: (state: State) => Promise<void>,
  publish: (state: State) => void,
) {
  let tail: Promise<void> = Promise.resolve();
  const enqueue = (change: StateMutation): Promise<State> => {
    const operation = tail.then(async () => {
      const latest = read();
      if (!latest) throw Error("Personal data is not loaded yet.");
      const next = change(structuredClone(latest));
      await write(next);
      publish(next);
      return next;
    });
    tail = operation.then(
      () => undefined,
      () => undefined,
    );
    return operation;
  };
  return Object.assign(enqueue, { idle: () => tail });
}
