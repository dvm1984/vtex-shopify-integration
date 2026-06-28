import {
  ExecutionResult,
  MutationFunctionOptions,
  OperationVariables,
} from "react-apollo";
import { Button } from "vtex.styleguide";

export const ButtonComponent = ({
  title,
  callbackFn,
}: {
  title: string;
  callbackFn?: (
    options?: MutationFunctionOptions<any, OperationVariables> | undefined
  ) => Promise<ExecutionResult<any>>;
}) => {
  return (
    <Button onClick={() => (callbackFn ? callbackFn() : "")}>{title}</Button>
  );
};
