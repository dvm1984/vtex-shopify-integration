// import { ApolloQueryResult } from "apollo-client";
import { Table } from "vtex.styleguide";

export default function TableComponent({
  schema,
  paginationState,
  productFetch,
  setProductPagination,
}: {
  schema: any;
  paginationState: any;
  productFetch: (variables: any) => {};
  setProductPagination: React.Dispatch<
    React.SetStateAction<{
      tableLength: number;
      currentPage: number;
      slicedData: any[];
      currentItemFrom: number;
      currentItemTo: number;
      itemsLength: number;
      emptyStateLabel: string;
    }>
  >;
}) {
  function productHandleNextClick() {
    const newPage = paginationState.currentPage + 1;
    const itemFrom = paginationState.currentItemTo + 1;
    const itemTo = 10 * newPage;
    productFetch({ from: itemFrom, to: itemTo });
    productGotoPage(newPage, itemFrom, itemTo);
  }

  function productHandlePrevClick() {
    if (paginationState.currentPage === 0) return;
    const newPage = paginationState.currentPage - 1;
    const itemFrom = paginationState.currentItemFrom - 10;
    const itemTo = paginationState.currentItemFrom - 1;
    productFetch({ from: itemFrom, to: itemTo });
    productGotoPage(newPage, itemFrom, itemTo);
  }

  function productGotoPage(
    currentPage: any,
    currentItemFrom: any,
    currentItemTo: any
  ) {
    setProductPagination((prev: any) => ({
      ...prev,
      currentPage,
      currentItemFrom,
      currentItemTo,
    }));
  }

  return (
    <Table
      fullWidth
      schema={schema}
      items={paginationState.slicedData}
      pagination={{
        onNextClick: productHandleNextClick,
        onPrevClick: productHandlePrevClick,
        currentItemFrom: paginationState.currentItemFrom,
        currentItemTo: paginationState.currentItemTo,
        textShowRows: "Show rows",
        textOf: "of",
        totalItems: paginationState.itemsLength,
      }}
    />
  );
}
