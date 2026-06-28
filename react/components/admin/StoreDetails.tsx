export const StoreDetails = ({ storeData }: any) => {
  return (
    <>
      {" "}
      <h3 className="t-heading-4 ma0 mb7">Connect the Store</h3>
      <h5 className="t-heading-5 ma0 mb6">
        Store Name:{" "}
        <span className="c-action-primary">
          {storeData?.Shopify_Store_Name}
        </span>
      </h5>
      <h5 className="t-heading-5 ma0 mb7">
        Store URL:{" "}
        <a
          className="c-action-primary"
          href={storeData?.Shopify_Store_URL}
          target="_blank"
        >
          {storeData?.Shopify_Store_URL}
        </a>
      </h5>
    </>
  );
};
