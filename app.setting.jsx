import {
  Page,
  TextField,
  Button,
  Layout,
  Card,
  Icon,
  Form,
  FormLayout,
  InlineStack,
  Box,
  Autocomplete,
  Select,
} from "@shopify/polaris";
import { DeleteIcon } from "@shopify/polaris-icons";
import { useLoaderData, useFetcher } from "@remix-run/react";
import { useEffect, useState } from "react";
import { json } from "@remix-run/node";
import { apiVersion, authenticate } from "../shopify.server";

let savedFields = [];

export async function action({ request }) {
  const formData = await request.formData();
  const rawFields = formData.get("fields");

  try {
    const parsedFields = JSON.parse(rawFields);
    savedFields = parsedFields;
    return json({ success: true });
  } catch (err) {
    console.error("Failed to parse fields:", err);
    return json({ success: false });
  }
}

export async function loader({ request }) {
  const { session } = await authenticate.admin(request);
  const { shop, accessToken } = session;

  try {
    const productsRes = await fetch(
      `https://${shop}/admin/api/${apiVersion}/products.json?fields=id,title,variants`,
      {
        method: "GET",
        headers: {
          "X-Shopify-Access-Token": accessToken,
          "Content-Type": "application/json",
        },
      }
    );

    const productsData = await productsRes.json();
    const products = productsData?.products || [];

    return json({ products, savedFields });
  } catch (error) {
    console.error("Error in loader:", error);
    return json({ products: [], savedFields: [] });
  }
}

export default function Settings() {
  const { products, savedFields } = useLoaderData();
  const fetcher = useFetcher();

  const [fields, setFields] = useState(
    savedFields.length > 0
      ? savedFields
      : [
          {
            text: "",
            productId: "",
            productTitle: "",
            variantId: "",
            discount: "",
          },
        ]
  );

  const [inputValues, setInputValues] = useState(
    savedFields.length > 0
      ? savedFields.map((f) => f.productTitle || "")
      : [""]
  );

  const [productOptions, setProductOptions] = useState(
    products.map((p) => ({
      label: p.title,
      value: p.id.toString(),
    }))
  );

  const addHandler = () => {
    setFields([
      ...fields,
      {
        text: "",
        productId: "",
        productTitle: "",
        variantId: "",
        discount: "",
      },
    ]);
    setInputValues([...inputValues, ""]);
  };

  const deleteHandler = (index) => {
    const newFields = fields.filter((_, i) => i !== index);
    setFields(newFields);
    setInputValues(inputValues.filter((_, i) => i !== index));
  };

  const saveHandler = () => {
    fetcher.submit(
      { fields: JSON.stringify(fields) },
      {
        method: "POST",
        encType: "application/x-www-form-urlencoded",
      }
    );
  };

  const handleProductSearch = (value, index) => {
    // Update input value for specific index
    const updatedInputs = [...inputValues];
    updatedInputs[index] = value;
    setInputValues(updatedInputs);

    // Filter product options based on input
    const filtered = products
      .filter((p) =>
        p.title.toLowerCase().includes(value.toLowerCase())
      )
      .map((p) => ({
        label: p.title,
        value: p.id.toString(),
      }));

    setProductOptions(filtered);
  };

  const handleProductSelect = (selected, index) => {
    const selectedProduct = products.find(
      (p) => p.id.toString() === selected[0]
    );

    const updatedFields = [...fields];
    updatedFields[index].productId = selectedProduct.id.toString();
    updatedFields[index].productTitle = selectedProduct.title;
    updatedFields[index].variantId = ""; // Reset variant
    setFields(updatedFields);

    const updatedInputs = [...inputValues];
    updatedInputs[index] = selectedProduct.title;
    setInputValues(updatedInputs);
  };

  return (
    <Page title="Post Purchase Settings">
      <Box display="flex" justifyContent="end" padding="400">
        <InlineStack gap="200" align="end">
          <Button onClick={addHandler}>Add</Button>
          <Button onClick={saveHandler} primary>
            Save
          </Button>
        </InlineStack>
      </Box>

      <Layout>
        <Layout.Section>
          <Card>
            <Form onSubmit={saveHandler}>
              <FormLayout>
                {fields.map((item, index) => {
                  const selectedProduct = products.find(
                    (p) => p.id.toString() === item.productId
                  );

                  const variantOptions =
                    selectedProduct?.variants
                      ?.filter((v) => v.title !== "Default Title")
                      ?.map((v) => ({
                        label: v.title,
                        value: v.id.toString(),
                      })) || [];

                  return (
                    <Card key={index}>
                      <InlineStack gap="400" align="start">
                        <Box width="25%">
                          <TextField
                            value={item.text}
                            label={`Field ${index + 1}`}
                            onChange={(value) => {
                              const newFields = [...fields];
                              newFields[index].text = value;
                              setFields(newFields);
                            }}
                          />
                        </Box>

                        <Box width="25%">
                          <Autocomplete
                            options={productOptions}
                            selected={
                              item.productId ? [item.productId] : []
                            }
                            textField={
                              <Autocomplete.TextField
                                label="Product"
                                value={inputValues[index]}
                                onChange={(value) =>
                                  handleProductSearch(value, index)
                                }
                                autoComplete="off"
                              />
                            }
                            onSelect={(selected) =>
                              handleProductSelect(selected, index)
                            }
                          />
                        </Box>

                        <Box width="25%">
                          <Select
                            label="Variant"
                            options={variantOptions}
                            value={item.variantId}
                            onChange={(value) => {
                              const newFields = [...fields];
                              newFields[index].variantId = value;
                              setFields(newFields);
                            }}
                          />
                        </Box>

                        <Box width="20%">
                          <TextField
                            value={item.discount}
                            label="Discount %"
                            type="number"
                            onChange={(value) => {
                              const newFields = [...fields];
                              newFields[index].discount = value;
                              setFields(newFields);
                            }}
                          />
                        </Box>

                        <Box paddingBlockStart="600">
                          <Button
                            onClick={() => deleteHandler(index)}
                            icon={<Icon source={DeleteIcon} />}
                            plain
                          />
                        </Box>
                      </InlineStack>
                    </Card>
                  );
                })}
              </FormLayout>
            </Form>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
