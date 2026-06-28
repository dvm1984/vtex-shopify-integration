import { useMutation } from "react-apollo";
import { ButtonComponent } from "./Button";
import restartBulk from "../../graphql/restartBulk.gql";

export default function RestartButton() {
  const [restartBulkHandler] = useMutation(restartBulk);

  return (
    <ButtonComponent
      title="Restart import process"
      callbackFn={restartBulkHandler}
    />
  );
}
