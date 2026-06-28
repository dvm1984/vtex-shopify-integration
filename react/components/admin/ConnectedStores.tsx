import { useEffect, useState } from "react";
import TableComponent from "./TableComponent";
import { PageBlock } from "vtex.styleguide";
import { useMutation, useQuery } from "react-apollo";
// import { ButtonComponent } from "./Button";
import getStores from "../../graphql/getStores.gql";
import { SpinnerComponent } from "./Spinner";
import deleteStores from "../../graphql/deleteStores.gql";
import syncProducts from "../../graphql/syncProducts.gql";
import { ButtonComponent } from "./Button";

export const ConnectedStores = () => {
  const [deleteStoreHandler] = useMutation(deleteStores);
  const [connectStoreHandler] = useMutation(syncProducts, {
    variables: {
      data: "",
    },
  });

  const [storesData, setData] = useState<
    {
      storeName: string;
      status: string;
    }[]
  >([]);
  const [stores, setStores] = useState({
    tableLength: 10,
    currentPage: 1,
    slicedData: [{}],
    currentItemFrom: 1,
    currentItemTo: 10,
    itemsLength: 100,
    emptyStateLabel: "Nothing to show.",
  });

  useEffect(() => {
    setStores((prev) => ({
      ...prev,
      slicedData: storesData.map((elem) => ({
        storeName: elem.storeName,
        status: elem.status,
        remove: elem.status,
      })),
    }));
  }, [storesData]);

  const { data, loading, refetch: storesFetch } = useQuery(getStores, {
    variables: {
      from: stores.currentItemFrom,
      to: stores.currentItemTo,
    },
    notifyOnNetworkStatusChange: true,
    fetchPolicy: "network-only",

    onCompleted: () => {
      if (!loading) {
        setData(JSON.parse(data.getStoresList));
      }
    },
  });
  const storeSchema = {
    properties: {
      storeName: {
        title: "Shopify Stores",
        width: 600,
      },
      status: {
        title: "Status",
        width: 500,
        cellRenderer: ({ cellData }: { cellData: any }) => {
          if (cellData === "connected") {
            return (
              <div className="pa3 br2 bg-success c-on-success dib mr3">
                Connected
              </div>
            );
          }
          return (
            <div className="pa3 br2 bg-muted-2 c-on-muted-2 dib mr3">
              Not Connected
            </div>
          );
        },
      },
      remove: {
        title: "Actions",
        cellRenderer: ({
          cellData,
          rowData,
        }: {
          cellData: string;
          rowData: any;
        }) => {
          if (cellData === "connected") {
            return (
              <div
                style={{ cursor: "pointer" }}
                className="pa3 br2 bg-danger--faded  c-danger r dib mr5 mv0 ba b--danger connect"
                onClick={() => {
                  deleteStoreHandler({
                    variables: { data: rowData.storeName },
                  });
                }}
              >
                Remove
              </div>
            );
          } else {
            return (
              <ButtonComponent
                callbackFn={() =>
                  connectStoreHandler({
                    variables: { data: rowData.storeName },
                  })
                }
                title="Connect"
              />
            );
          }
        },
      },
    },
  };

  return (
    <PageBlock>
      <div style={{ position: "relative" }}>
        <TableComponent
          schema={storeSchema}
          paginationState={stores}
          productFetch={storesFetch}
          setProductPagination={setStores}
        />
      </div>
      {loading && <SpinnerComponent />}
    </PageBlock>
  );
};
