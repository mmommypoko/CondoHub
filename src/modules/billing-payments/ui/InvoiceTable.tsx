import { Badge, DataTable, DataTableCell, DataTableRow } from '@/shared/ui';
import type { InvoiceDto } from '@/modules/billing-payments/application/index';
import { invoiceStateLabel, invoiceStateVariant, kindLabel } from '@/modules/billing-payments/ui/billingLabels';

export function InvoiceTable({
  rows,
  basePath,
  caption,
}: {
  rows: InvoiceDto[];
  basePath: string;
  caption: string;
}) {
  return (
    <DataTable
      testId="invoice-list"
      caption={caption}
      columns={[
        { key: 'invoice', header: 'Invoice' },
        { key: 'state', header: 'State' },
        { key: 'total', header: 'Total', numeric: true },
        { key: 'outstanding', header: 'Outstanding', numeric: true },
        { key: 'due', header: 'Due', numeric: true },
      ]}
    >
      {rows.map((row) => (
        <DataTableRow key={row.id} rowKey={row.id}>
          <DataTableCell link href={`${basePath}/${row.id}`} linkTestId={`invoice-row-${row.id}`}>
            {kindLabel(row.kind)} · {row.periodStart}
          </DataTableCell>
          <DataTableCell>
            <Badge data-testid={`invoice-state-${row.id}`} variant={invoiceStateVariant(row.state)}>
              {invoiceStateLabel(row.state)}
            </Badge>
          </DataTableCell>
          <DataTableCell numeric>
            <span data-testid={`invoice-total-${row.id}`} className="ui-tabular">
              {row.total.amount} {row.total.currency}
            </span>
          </DataTableCell>
          <DataTableCell numeric>
            <span data-testid={`invoice-outstanding-${row.id}`} className="ui-tabular">
              {row.outstanding.amount} {row.outstanding.currency}
            </span>
          </DataTableCell>
          <DataTableCell numeric>
            <span className="ui-tabular">
              Due {row.dueDate}
              {row.overdue ? ' · Overdue' : ''}
            </span>
          </DataTableCell>
        </DataTableRow>
      ))}
    </DataTable>
  );
}
