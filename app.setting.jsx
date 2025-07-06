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
    Toast,
    Frame,
    Grid,
    Text
} from "@shopify/polaris";
import { DeleteIcon } from "@shopify/polaris-icons";
import { useLoaderData, useFetcher } from "@remix-run/react";
import { useEffect, useState, useCallback } from "react";
import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";

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
        const graphqlQuery = {
            query: `
        {
          products(first: 50) {
            edges {
              node {
                id
                title
                variants(first: 10) {
                  edges {
                    node {
                      id
                      title
                    }
                  }
                }
                productCategory {
                  productTaxonomyNode {
                    fullName
                  }
                }
              }
            }
          }
        }
      `
        };

        const res = await fetch(`https://${shop}/admin/api/2024-04/graphql.json`, {
            method: "POST",
            headers: {
                "X-Shopify-Access-Token": accessToken,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(graphqlQuery),
        });

        const result = await res.json();

        const products = result.data.products.edges.map((edge) => {
            const product = edge.node;
            return {
                id: product.id,
                title: product.title,
                category: product.productCategory?.productTaxonomyNode?.fullName || "",
                variants: product.variants?.edges.map((vEdge) => ({
                    id: vEdge.node.id,
                    title: vEdge.node.title,
                })) || [],
            };
        });

        const productCategories = [
            ...new Set(products.map((p) => p.category).filter((c) => c))
        ];

        return json({ products, productCategories, savedFields });
    } catch (error) {
        console.error("Error in GraphQL loader:", error);
        return json({ products: [], productCategories: [], savedFields: [] });
    }
}



export default function Settings() {
    const { products, productCategories, savedFields } = useLoaderData();
    const fetcher = useFetcher();
    const [toastActive, setToastActive] = useState(false);

    const toggleToastActive = useCallback(() => setToastActive((active) => !active), []);
    const toastMarkup = toastActive ? (
        <Toast content="Settings saved successfully!" onDismiss={toggleToastActive} />
    ) : null;

    const [fields, setFields] = useState(
        savedFields.length > 0
            ? savedFields
            : [{ text: "", productId: "", productTitle: "", variantId: "", discount: "" }]
    );

    const [productOptions, setProductOptions] = useState([]);
    const [inputValues, setInputValues] = useState(fields.map((f) => f.productTitle || ""));

    useEffect(() => {
        const options = products.map((p) => ({
            label: p.title,
            value: p.id.toString(),
        }));
        setProductOptions(options);
    }, [products]);

    const addHandler = () => {
        setFields([
            ...fields,
            { text: "", productId: "", productTitle: "", variantId: "", discount: "" },
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

        // ✅ Show toast
        setToastActive(true);
    };

    const handleProductSearch = (value, index) => {
        setInputValues((prev) => prev.map((v, i) => (i === index ? value : v)));
        const filtered = products
            .filter((p) => p.title.toLowerCase().includes(value.toLowerCase()))
            .map((p) => ({
                label: p.title,
                value: p.id.toString(),
            }));
        setProductOptions(filtered);
    };

    const handleProductSelect = (selected, index) => {
        const selectedProduct = products.find((p) => p.id.toString() === selected[0]);
        const updatedFields = [...fields];
        updatedFields[index].productId = selectedProduct.id.toString();
        updatedFields[index].productTitle = selectedProduct.title;
        updatedFields[index].variantId = "";
        setFields(updatedFields);

        const updatedInputs = [...inputValues];
        updatedInputs[index] = selectedProduct.title;
        setInputValues(updatedInputs);
    };

    return (
        <Frame>
            {toastMarkup}

            <Page title="Post Purchase Settings">
                <Box padding="400" gap="400">
                    <InlineStack gap="200" align="end">
                        <Button
                            onClick={addHandler}
                            variant="primary"
                            size="large"
                        >
                            Add Offer
                        </Button>
                        <Button
                            onClick={saveHandler}
                            primary
                            size="large"
                        >
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
                                            selectedProduct?.variants?.map((v) => {
                                                if (v.title === "Default Title") {
                                                    v.title = selectedProduct.title;
                                                }
                                                return v;
                                            })?.map((v) => ({
                                                label: v.title,
                                                value: v.id.toString(),
                                            })) || [];

                                        variantOptions.unshift({
                                            label: "Select a variant",
                                            value: "",
                                        });

                                        return (
                                            <Page fullWidth key={index}>
                                                <Box paddingBlockEnd="400">
                                                    <Card>
                                                        <Grid columns={{ xs: 6, sm: 6, md: 12, lg: 12, xl: 12 }}>
                                                            {/* Left Content: All Fields */}
                                                            <Grid.Cell columnSpan={{ xs: 6, sm: 6, md: 11, lg: 11, xl: 11 }}>
                                                                {/* Row 1: Heading + Discount */}
                                                                <Box paddingBlockStart="400">
                                                                    <Text as="h2" variant="headingLg">Offer # {index + 1}</Text>
                                                                </Box>
                                                                <hr/>
                                                                <InlineStack gap="400" wrap={false}>
                                                                    <Box width="45%" paddingBlockStart="400">
                                                                        <Text >Heading</Text>
                                                                        <TextField
                                                                            value={item.text}
                                                                            label="Heading"
                                                                            labelHidden
                                                                            onChange={(value) => {
                                                                                const newFields = [...fields];
                                                                                newFields[index].text = value;
                                                                                setFields(newFields);
                                                                            }}
                                                                        />
                                                                    </Box>
                                                                    <Box width="45%" paddingBlockStart="400">
                                                                        <p class="Polaris-Text--bodyMd">Discount</p>

                                                                        <TextField
                                                                            value={item.discount}
                                                                            label="Discount %"
                                                                            type="number"
                                                                            labelHidden
                                                                            onChange={(value) => {
                                                                                const newFields = [...fields];
                                                                                newFields[index].discount = value;
                                                                                setFields(newFields);
                                                                            }}
                                                                        />
                                                                    </Box>
                                                                </InlineStack>


                                                                {/* Row 2: Product + Variant */}
                                                                <InlineStack gap="400" wrap={false} paddingBlockStart="300">
                                                                    <Box width="45%" paddingBlockStart="400">
                                                                        <Autocomplete
                                                                            options={productOptions}
                                                                            selected={[item.productId]}
                                                                            textField={
                                                                                <Autocomplete.TextField
                                                                                    label="Product"
                                                                                    value={inputValues[index]}
                                                                                    onChange={(value) => handleProductSearch(value, index)}
                                                                                    autoComplete="off"
                                                                                />
                                                                            }
                                                                            onSelect={(selected) => handleProductSelect(selected, index)}
                                                                        />
                                                                    </Box>
                                                                    <Box width="45%" paddingBlockStart="400">
                                                                        <Select
                                                                            label="Variant"
                                                                            options={[
                                                                                { label: "Select a variant", value: "" },
                                                                                ...(selectedProduct?.variants || []).map((v) => ({
                                                                                    label: v.title === "Default Title" ? selectedProduct.title : v.title,
                                                                                    value: v.id.toString(),
                                                                                })),
                                                                            ]}
                                                                            value={item.variantId}
                                                                            onChange={(value) => {
                                                                                const newFields = [...fields];
                                                                                newFields[index].variantId = value;
                                                                                setFields(newFields);
                                                                            }}
                                                                        />
                                                                    </Box>
                                                                </InlineStack>

                                                                {/* Row 3: Rule Title */}
                                                                <Box paddingBlockStart="400" paddingBlockEnd="400">
                                                                    <Text variant="headingLg" as="h1" paddingBlockEnd="600">Select Rules</Text>
                                                                    <hr/>
                                                                </Box>
                                                                
                                                                {/* Row 4: Has Product/Category + Conditional */}
                                                                <InlineStack gap="400" wrap={false}>
                                                                    <Box width="45%" paddingBlockStart="400">
                                                                        <Select
                                                                            label="Choose Input"
                                                                            options={[
                                                                                { label: "Select Type", value: "" },
                                                                                { label: "Has Product", value: "product" },
                                                                                { label: "Has Category", value: "category" },
                                                                            ]}
                                                                            value={item.type || ""}
                                                                            onChange={(value) => {
                                                                                const newFields = [...fields];
                                                                                newFields[index] = {
                                                                                    ...newFields[index],
                                                                                    type: value,
                                                                                    newProductId: "",
                                                                                    newVariantId: "",
                                                                                    category: "",
                                                                                };
                                                                                setFields(newFields);
                                                                            }}
                                                                        />
                                                                    </Box>

                                                                    <Box width="45%" paddingBlockStart="400">
                                                                        {item.type === "product" && (
                                                                            <>
                                                                                <Autocomplete
                                                                                    options={productOptions}
                                                                                    selected={[item.newProductId || ""]}
                                                                                    textField={
                                                                                        <Autocomplete.TextField
                                                                                            label="New Product"
                                                                                            value={item.newProductTitle || ""}
                                                                                            onChange={(value) => {
                                                                                                const filtered = products
                                                                                                    .filter((p) => p.title.toLowerCase().includes(value.toLowerCase()))
                                                                                                    .map((p) => ({ label: p.title, value: p.id.toString() }));

                                                                                                const updatedFields = [...fields];
                                                                                                updatedFields[index].newProductTitle = value;
                                                                                                setProductOptions(filtered);
                                                                                                setFields(updatedFields);
                                                                                            }}
                                                                                            autoComplete="off"
                                                                                        />
                                                                                    }
                                                                                    onSelect={(selected) => {
                                                                                        const selectedProduct = products.find((p) => p.id.toString() === selected[0]);
                                                                                        const updatedFields = [...fields];
                                                                                        updatedFields[index].newProductId = selectedProduct.id.toString();
                                                                                        updatedFields[index].newProductTitle = selectedProduct.title;
                                                                                        updatedFields[index].newVariantId = "";
                                                                                        setFields(updatedFields);
                                                                                    }}
                                                                                />
                                                                                <Box marginTop="200">
                                                                                    <Select
                                                                                        label="New Variant"
                                                                                        options={[
                                                                                            { label: "Select a variant", value: "" },
                                                                                            ...(products.find((p) => p.id.toString() === item.newProductId)?.variants || []).map((v) => ({
                                                                                                label:
                                                                                                    v.title === "Default Title"
                                                                                                        ? products.find((p) => p.id.toString() === item.newProductId)?.title || "Default"
                                                                                                        : v.title,
                                                                                                value: v.id.toString(),
                                                                                            })),
                                                                                        ]}
                                                                                        value={item.newVariantId || ""}
                                                                                        onChange={(value) => {
                                                                                            const updatedFields = [...fields];
                                                                                            updatedFields[index].newVariantId = value;
                                                                                            setFields(updatedFields);
                                                                                        }}
                                                                                    />
                                                                                </Box>
                                                                            </>
                                                                        )}

                                                                        {item.type === "category" && (
                                                                            <Select
                                                                                label="Category"
                                                                                options={productCategories.map((cat) => ({
                                                                                    label: cat,
                                                                                    value: cat,
                                                                                }))}
                                                                                value={item.category || ""}
                                                                                onChange={(value) => {
                                                                                    const updatedFields = [...fields];
                                                                                    updatedFields[index].category = value;
                                                                                    setFields(updatedFields);
                                                                                }}
                                                                            />
                                                                        )}
                                                                    </Box>
                                                                </InlineStack>
                                                            </Grid.Cell>

                                                            {/* Delete Button - Right Centered */}
                                                            <Grid.Cell columnSpan={{ xs: 6, sm: 6, md: 1, lg: 1, xl: 1 }}>
                                                                <Box
                                                                    height="100%"
                                                                    display="flex"
                                                                    alignItems="center"
                                                                    justifyContent="flex-end"
                                                                >
                                                                    <Button
                                                                        onClick={() => deleteHandler(index)}
                                                                        icon={DeleteIcon}
                                                                        plain
                                                                    />
                                                                </Box>
                                                            </Grid.Cell>
                                                        </Grid>
                                                    </Card>
                                                </Box>
                                                <Button>Save</Button>
                                            </Page>

                                        );
                                    })}
                                </FormLayout>
                            </Form>
                        </Card>
                    </Layout.Section>
                </Layout>
            </Page>
        </Frame>
    );
}
