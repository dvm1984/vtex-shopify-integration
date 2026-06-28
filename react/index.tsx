import React, { FC, useState } from "react";
import { useQuery } from "react-apollo";
import { PageBlock } from "vtex.styleguide";
import {
  Layout,
  PageHeader,
  IconCaretDown,
  ButtonWithIcon,
  IconCaretUp,
} from "vtex.styleguide";
import "./styles.global.css";

import { RegisterButton } from "./components/admin/RegisterButton";
import RestartButton from "./components/admin/RestartButton";
import getBulk from "./graphql/getBulk.gql";
import getStoreStatus from "./graphql/getStoreStatus.gql";
import getCurrentStore from "./graphql/getCurrentStore.gql";
import { StoreDetails } from "./components/admin/StoreDetails";
import { ConnectedStores } from "./components/admin/ConnectedStores";
import WebhookStatusForm from "./components/admin/WebhookStatus";

const AdminExample: FC = () => {
  const [bulkData, setBulk] = useState(false);
  const { data: bulkImportData, loading: loadingBulk } = useQuery(getBulk, {
    notifyOnNetworkStatusChange: true,
    fetchPolicy: "network-only",

    onCompleted: () => {
      if (!loadingBulk) {
        const jsonData = JSON.parse(bulkImportData.getBulk);
        if (jsonData.status === "started") setBulk(true);
      }
    },
  });
  const [showErrors, setShow] = useState(false);
  const [currentStore, setStore] = useState({ name: "", status: true });

  const { data, loading } = useQuery(getStoreStatus, {
    notifyOnNetworkStatusChange: true,
    fetchPolicy: "network-only",

    onCompleted: async () => {
      if (!loading) {
        const storeData = await JSON.parse(data.getStoreStatus);
        if (storeData.status === "connected") {
          setStore({ name: storeData.storeName, status: false });
        }
      }
    },
  });
  const [storeData, setData] = useState<{
    Shopify_Store_URL: string;
    Shopify_Store_Name: string;
  }>();
  const { data: store, loading: storeLoading } = useQuery(getCurrentStore, {
    notifyOnNetworkStatusChange: true,
    fetchPolicy: "network-only",

    onCompleted: () => {
      if (!storeLoading) {
        setData(JSON.parse(store.getCurrentStore));
      }
    },
  });

  return (
    <Layout
      pageHeader={<PageHeader title="Shopify ERP Connector" className="mb5" />}
      fullWidth
    >
      <div>
        {currentStore.status ? (
          storeData?.Shopify_Store_Name ? (
            <PageBlock>
              <StoreDetails storeData={storeData} />
              <RegisterButton />
            </PageBlock>
          ) : (
            <h3>Enter Shopify Store Details in the Configuration Form</h3>
          )
        ) : (
          <h2>{currentStore.name} Store Connected</h2>
        )}
        <div className="mt7">
          <ConnectedStores />
        </div>
      </div>
      {bulkData && (
        <>
          <div className="mt7 mb7">
            <ButtonWithIcon
              icon={
                showErrors ? (
                  <IconCaretUp size={12} />
                ) : (
                  <IconCaretDown size={12} />
                )
              }
              variation="tertiary"
              iconPosition="right"
              size="small"
              onClick={() => setShow((prev) => !prev)}
            >
              Additional Settings{" "}
            </ButtonWithIcon>
          </div>
          {showErrors && (
            <>
              <p className="t-small-6 ma0 mb5">
                Restart the process only if the import stops
              </p>
              <RestartButton />{" "}
            </>
          )}{" "}
        </>
      )}
      <div className="forms">
        <PageBlock>
          <WebhookStatusForm />
        </PageBlock>
      </div>
    </Layout>
  );
};

export default AdminExample;
