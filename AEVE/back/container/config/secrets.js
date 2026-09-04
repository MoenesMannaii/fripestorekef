module.exports = {
  // Admin secret key (existing)
  ADMIN_SECRET_CODE: '_0x1002ap66',

  // Deletion authorization codes (hardcoded, never stored in DB)
  DELETION_SECRET_CODE: '1234',

  // Up to 10 deletion barcodes. Leave empty strings for unused slots.
  DELETION_BARCODES: [
    'ADMIN-DELETE',   // Code 1
    '',               // Code 2
    '',               // Code 3
    '',               // Code 4
    '',               // Code 5
    '',               // Code 6
    '',               // Code 7
    '',               // Code 8
    '',               // Code 9
    '',               // Code 10
  ],
};