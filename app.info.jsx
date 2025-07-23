import {
  Card,
  Page,
  DataTable,
  Thumbnail,
  Text,
  Pagination,
  HorizontalStack,
  Box,
} from '@shopify/polaris';
import React, { useState } from 'react';

function AppDetails() {
  const rowsData = [
    [
      <Thumbnail
        source="https://welpix.com/wp-content/uploads/2024/06/A-guide-to-skincare-product-photography.webp"
        alt="Image"
      />,
      <Text alignment="center">1</Text>,
      <Text alignment="center">Facewash</Text>,
      <Text alignment="center">5,000</Text>,
      <Text alignment="center">5%</Text>,
      <Text alignment="center">$10,000</Text>,
      <Text alignment="center">$600</Text>,
    ],
    [
      <Thumbnail
        source="https://welpix.com/wp-content/uploads/2024/06/A-guide-to-skincare-product-photography.webp"
        alt="Image"
      />,
      <Text alignment="center">2</Text>,
      <Text alignment="center">Moisturizer</Text>,
      <Text alignment="center">3,200</Text>,
      <Text alignment="center">3.2%</Text>,
      <Text alignment="center">$7,800</Text>,
      <Text alignment="center">$190</Text>,
    ],
    [
      <Thumbnail
        source="https://welpix.com/wp-content/uploads/2024/06/A-guide-to-skincare-product-photography.webp"
        alt="Image"
      />,
      <Text alignment="center">3</Text>,
      <Text alignment="center">Sunscreen</Text>,
      <Text alignment="center">7,100</Text>,
      <Text alignment="center">6.1%</Text>,
      <Text alignment="center">$15,400</Text>,
      <Text alignment="center">$260</Text>,
    ],
  ];

  const itemsPerPage = 2;
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = Math.ceil(rowsData.length / itemsPerPage);

  const paginatedRows = rowsData.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <Page title="Sales Table">
      <Card>
        <DataTable
          columnContentTypes={[
            'text',
            'text',
            'text',
            'text',
            'text',
            'text',
            'text',
          ]}
          headings={[
            'Image',
            'Serial No.',
            'Product Name',
            'Impressions',
            'Conversion %',
            'Total Revenue',
            'Avg Revenue',
          ]}
          rows={paginatedRows}
          verticalAlign="middle"
        />

        <Box paddingBlockStart="400">
          <HorizontalStack align="center">
            <Pagination
              hasPrevious={currentPage > 1}
              onPrevious={() => setCurrentPage((p) => p - 1)}
              hasNext={currentPage < totalPages}
              onNext={() => setCurrentPage((p) => p + 1)}
            />
          </HorizontalStack>
        </Box>
      </Card>
    </Page>
  );
}

export default AppDetails;
