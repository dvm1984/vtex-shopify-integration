import { useMutation } from "react-apollo";
import { Button } from "vtex.styleguide";
import registerWebhooks from "../../graphql/registerWebhooks.gql";

const WebhookStatusForm = () => {
  const [registerWebhooksHandler] = useMutation(registerWebhooks);
  return (
    <Button variation="primary" type="button" onClick={registerWebhooksHandler}>
      Enable automatic webhook reconnection
    </Button>
  );
};

export default WebhookStatusForm;
