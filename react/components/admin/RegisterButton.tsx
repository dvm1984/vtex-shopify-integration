import { useMutation } from "react-apollo";
import syncProducts from "../../graphql/syncProducts.gql";
import { ButtonComponent } from "./Button";

export const RegisterButton = () => {
  const [syncProductsHandler] = useMutation(syncProducts);

  return (
    <div className="mr6">
      <ButtonComponent
        callbackFn={syncProductsHandler}
        title="Register Webhooks & Sync Products"
      />
    </div>
  );
};
