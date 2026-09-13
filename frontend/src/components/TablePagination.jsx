import { CaretLeft, CaretRight } from 'phosphor-react';

/**
 * Light-themed pagination bar for admin tables.
 * Renders "Showing X–Y of Z" plus prev / numbered / next controls.
 */
export const TablePagination = ({ page, perPage, totalItems, onPageChange, testId = 'table-pagination' }) => {
  const totalPages = Math.max(1, Math.ceil(totalItems / perPage));
  if (totalPages <= 1) return null;

  const start = (page - 1) * perPage + 1;
  const end = Math.min(page * perPage, totalItems);

  // Windowed page numbers (max 7 buttons with ellipsis)
  const pages = [];
  const window = 1;
  for (let p = 1; p <= totalPages; p += 1) {
    if (p === 1 || p === totalPages || (p >= page - window && p <= page + window)) {
      pages.push(p);
    } else if (pages[pages.length - 1] !== '…') {
      pages.push('…');
    }
  }

  const btn = 'w-9 h-9 flex items-center justify-center rounded text-sm transition-colors';

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 pt-4 border-t border-[#dbdadd]" data-testid={testId}>
      <p className="text-sm text-[#898989]" data-testid={`${testId}-summary`}>
        Showing {start}–{end} of {totalItems}
      </p>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page === 1}
          className={`${btn} border border-[#dbdadd] text-[#000000] hover:border-[#832161] hover:text-[#832161] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:border-[#dbdadd] disabled:hover:text-[#000000]`}
          data-testid={`${testId}-prev`}
        >
          <CaretLeft size={16} />
        </button>
        {pages.map((p, i) =>
          p === '…' ? (
            <span key={`e${i}`} className="w-9 h-9 flex items-center justify-center text-[#898989]">…</span>
          ) : (
            <button
              key={p}
              onClick={() => onPageChange(p)}
              className={`${btn} border ${
                p === page
                  ? 'border-[#832161] bg-[#832161] text-white'
                  : 'border-[#dbdadd] text-[#000000] hover:border-[#832161] hover:text-[#832161]'
              }`}
              data-testid={`${testId}-page-${p}`}
            >
              {p}
            </button>
          )
        )}
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page === totalPages}
          className={`${btn} border border-[#dbdadd] text-[#000000] hover:border-[#832161] hover:text-[#832161] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:border-[#dbdadd] disabled:hover:text-[#000000]`}
          data-testid={`${testId}-next`}
        >
          <CaretRight size={16} />
        </button>
      </div>
    </div>
  );
};

export default TablePagination;
