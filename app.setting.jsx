import {
  Page,
  TextField,
  Button,
  Layout,
  Card,
  Autocomplete,
  Icon,
  Form,
  FormLayout,
  InlineStack,
  Box
} from "@shopify/polaris";
import { DeleteIcon } from "@shopify/polaris-icons";
import { useLoaderData, useFetcher } from "@remix-run/react";
import { useState } from "react";
import { json } from "@remix-run/node";
import { apiVersion, authenticate } from "../shopify.server";

// In-memory temporary store
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

    const variantOptions = products.flatMap((product) =>
      (product.variants || [])
        .filter((variant) => variant.title !== "Default Title")
        .map((variant) => ({
          label: `${product.title} - ${variant.title}`,
          value: JSON.stringify({ productName: product.title, variantId: variant.id }),
        }))
    );

    return json({ variantOptions, savedFields });
  } catch (error) {
    console.error("Error in loader:", error);
    return json({ variantOptions: [], savedFields: [] });
  }
}

export default function Settings() {
  const { variantOptions, savedFields } = useLoaderData();
  const [name, setName] = useState("");
  const [fields, setFields] = useState(
    savedFields.length > 0
      ? savedFields
      : [{ text: "", variant: "", discount: "", inputValue: "" }]
  );

  const fetcher = useFetcher();

  const addHandler = () => {
    setFields([...fields, { text: "", variant: "", discount: "", inputValue: "" }]);
  };

  const deleteHandler = (index) => {
    setFields(fields.filter((_, i) => i !== index));
  };

  const saveHandler = () => {
    const fieldsToSave = fields.map(({ inputValue, ...rest }) => rest); // inputValue frontend use k liye hai
    fetcher.submit(
      {
        fields: JSON.stringify(fieldsToSave),
      },
      {
        method: "POST",
        encType: "application/x-www-form-urlencoded",
      }
    );
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
                <TextField
                  value={name}
                  label="Name"
                  onChange={setName}
                  autoComplete="off"
                />
              </FormLayout>
            </Form>
          </Card>

          {fields.map((item, index) => {
            const filteredOptions = variantOptions.filter((option) =>
              option.label.toLowerCase().includes((item.inputValue || "").toLowerCase())
            );

            return (
              <Card key={index}>
                <InlineStack gap="400" align="start">
                  <Box width="33%">
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

                  <Box width="33%">
                    <Autocomplete
                      options={filteredOptions}
                      selected={[]}
                      textField={
                        <Autocomplete.TextField
                          label="Search Variant"
                          value={item.inputValue}
                          onChange={(value) => {
                            const newFields = [...fields];
                            newFields[index].inputValue = value;
                            setFields(newFields);
                          }}
                          autoComplete="off"
                        />
                      }
                      onSelect={(selected) => {
                        const selectedOption = variantOptions.find(
                          (option) => option.value === selected[0]
                        );

                        if (selectedOption) {
                          const parsed = JSON.parse(selectedOption.value);
                          const newFields = [...fields];
                          newFields[index].variant = parsed.variantId; // store variant ID
                          newFields[index].inputValue = parsed.productName; // only product name appears
                          setFields(newFields);
                        }
                      }}
                    />
                  </Box>

                  <Box width="25%">
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
        </Layout.Section>
      </Layout>
    </Page>
  );
}
