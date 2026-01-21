# KPI Tables by Report Type

Purpose: Define the required KPI rows per report type for Section 2 (Financial Snapshot). Each list includes core KPIs that must be present even if values are unavailable. Optional KPIs can be added when relevant.

Source of truth: `backend/src/services/orchestrator.ts` (getFinancialSnapshotRequiredKpis).

## Industrials
Core KPIs (include unit in metric name):
- Revenue (Latest Period) ($M)
- Revenue Growth (YoY) (%)
- Gross Margin (%)
- EBITDA ($M)
- EBITDA Margin (%)
- Operating Income (EBIT) ($M)
- Operating Margin (%)
- Net Income ($M)
- Net Margin (%)
- Free Cash Flow ($M)
- CapEx ($M)
- Cash and Equivalents ($M)
- Total Debt ($M)
- Net Debt ($M)
- Net Leverage (x)
- Days Sales Outstanding (DSO) (days)
- Days Inventory Outstanding (DIO) (days)
- Inventory Turns (x)
- Days Payable Outstanding (DPO) (days)
- Working Capital ($M)

Optional KPIs (add 2-4 if relevant, include unit):
- Backlog ($M)
- Book-to-bill (x)
- Order Growth (%)
- Utilization (%)
- Capacity Expansion (%)
- Pricing/Mix Impact (%)

## Private Equity
Core KPIs (include unit in metric name):
- Assets Under Management (AUM) ($B)
- Fund Size (Latest Fund) ($B)
- Dry Powder ($B)
- Fee-Related Earnings ($M)
- Fee-Related Earnings Margin (%)
- Management Fee Rate (%)
- Realized Value (DPI) (x)
- Total Value (TVPI) (x)
- Net IRR (%)
- Active Portfolio Companies (Count)
- Typical Hold Period (years)
- Recent Exits (Count, 12-24 months)

Optional KPIs (add 2-4 if relevant, include unit):
- Gross MOIC (x)
- Value Creation Multiple (x)
- Add-on Acquisition Count (Count)
- Sector Allocation Share (%)
- Top Fund Performance Quartile (%)

## Financial Services
Core KPIs (include unit in metric name):
- Total Assets ($B)
- Revenue (or Net Revenue) ($M)
- Net Interest Margin (%)
- Efficiency Ratio (%)
- Return on Equity (ROE) (%)
- Return on Assets (ROA) (%)
- CET1 Ratio (or Primary Capital Ratio) (%)
- Loan/Deposit Ratio (%)
- Non-Performing Loan Ratio (%)
- Cost of Risk / Credit Loss Ratio (%)
- Liquidity Coverage Ratio (%)
- Net New Assets / AUM ($B)

Optional KPIs (add 2-4 if relevant, include unit):
- Deposit Growth (%)
- Loan Growth (%)
- Fee Income Mix (%)
- Capital Return (Dividends/Buybacks) ($M)
- Regulatory Capital Buffers (%)

## Generic Brief
Core KPIs (include unit in metric name):
- Revenue ($M)
- Revenue Growth (YoY) (%)
- EBITDA (or Operating Income) ($M)
- EBITDA Margin (or Operating Margin) (%)
- Net Income ($M)
- Net Margin (%)
- Free Cash Flow ($M)
- Cash and Equivalents ($M)
- Total Debt ($M)
- Net Debt ($M)

Optional KPIs (add 2-4 if relevant, include unit):
- Industry-specific unit metrics (e.g., ARPU ($), occupancy (%), same-store sales (%))
- Customer metrics (retention (%), churn (%), NPS (score))
- Volume/throughput metrics (units)
- Geographic mix metrics (%)
