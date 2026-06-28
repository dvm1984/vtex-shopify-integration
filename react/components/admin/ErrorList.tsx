import { useQuery } from "react-apollo";
import { PageBlock, Tabs, Tab } from "vtex.styleguide";

import getProductError from "../../graphql/getProductError.gql";
import getSkuError from "../../graphql/getSkuError.gql";
// @ts-ignore
import dateformat from "dateformat";
import { useEffect, useState } from "react";
import TableComponent from "./TableComponent";
import { SpinnerComponent } from "./Spinner";
// import { CONSTANTS } from "../../constants/constants";

export const ErrorList = () => {
  const [productError, setProducts] = useState<any[]>([]);
  const [skuError, setSku] = useState<any[]>([]);
  const [productPaginationState, setProductPagination] = useState({
    tableLength: 10,
    currentPage: 1,
    slicedData: productError,
    currentItemFrom: 1,
    currentItemTo: 10,
    itemsLength: 100,
    emptyStateLabel: "Nothing to show.",
  });
  useEffect(() => {
    setProductPagination((prev) => ({
      ...prev,
      slicedData: productError,
    }));
  }, [productError]);

  const [skuPaginationState, setSkuPagination] = useState({
    tableLength: 10,
    currentPage: 1,
    slicedData: skuError,
    currentItemFrom: 1,
    currentItemTo: 10,
    itemsLength: 100,
    emptyStateLabel: "Nothing to show.",
  });
  useEffect(() => {
    setSkuPagination((prev) => ({
      ...prev,
      slicedData: skuError,
    }));
  }, [skuError]);

  const { data, loading, refetch: productFetch } = useQuery(getProductError, {
    variables: {
      from: productPaginationState.currentItemFrom,
      to: productPaginationState.currentItemTo,
    },
    notifyOnNetworkStatusChange: true,
    fetchPolicy: "network-only",

    onCompleted: () => {
      if (!loading) {
        setProducts(JSON.parse(data.getProductErrorList));
      }
    },
  });
  const { data: skuData, loading: loadingSku, refetch: skuFetch } = useQuery(
    getSkuError,
    {
      variables: {
        from: skuPaginationState.currentItemFrom,
        to: skuPaginationState.currentItemTo,
      },
      notifyOnNetworkStatusChange: true,
      fetchPolicy: "network-only",
      onCompleted: () => {
        if (!loadingSku) {
          setSku(JSON.parse(skuData.getSkuErrorList));
        }
      },
    }
  );
  const productSchema = {
    properties: {
      productId: {
        title: "Product ID",
        width: 300,
      },
      productName: {
        title: "Product Name",
        width: 350,
      },
      Issue: {
        title: "Issue",
        width: 350,
      },
      reportedAt: {
        title: "Reported At",
        width: 350,
        cellRenderer: ({ cellData }: { cellData: any }) => {
          const date = `${dateformat(cellData, "mmmm dS, yyyy")}   ${dateformat(
            cellData,
            "longTime",
            true
          )}`;

          return <>{date}</>;
        },
      },
    },
  };
  const skuSchema = {
    properties: {
      productId: {
        title: "Product ID",
        width: 300,
      },
      productName: {
        title: "Product Name",
        width: 350,
      },

      skuName: {
        title: "SKU Name",
        width: 350,
      },
      skuId: {
        title: "SKU ID",
        width: 300,
      },
      Issue: {
        title: "Issue",
        width: 350,
      },
      reportedAt: {
        title: "Reported At",
        width: 350,
        cellRenderer: ({ cellData }: { cellData: any }) => {
          const date = `${dateformat(cellData, "mmmm dS, yyyy")}   ${dateformat(
            cellData,
            "longTime",
            true
          )}`;

          return <>{date}</>;
        },
      },
    },
  };

  const [tab, setTab] = useState(1);
  return (
    <PageBlock>
      <Tabs>
        <Tab
          label="Product Issues"
          active={tab === 1}
          onClick={() => setTab(1)}
        >
          <div className="ml6 mr6" style={{ position: "relative" }}>
            <h2 className="mt8 mb6">Import failed Products</h2>

            <TableComponent
              schema={productSchema}
              paginationState={productPaginationState}
              productFetch={productFetch}
              setProductPagination={setProductPagination}
            />
            {loading && <SpinnerComponent />}
          </div>
        </Tab>
        <Tab label="SKU Issues" active={tab === 2} onClick={() => setTab(2)}>
          <div className="ml6 mr6" style={{ position: "relative" }}>
            <h2 className="mt8 mb6">Import failed SKUs</h2>
            <TableComponent
              schema={skuSchema}
              paginationState={skuPaginationState}
              productFetch={skuFetch}
              setProductPagination={setSkuPagination}
            />
            {loadingSku && <SpinnerComponent />}
          </div>
        </Tab>
      </Tabs>
    </PageBlock>
  );
};
