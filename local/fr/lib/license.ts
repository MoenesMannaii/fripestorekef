export const VALID_LICENSE = "123";

export function isLicenseValid() {
  if (typeof window !== "undefined") {
    const license = localStorage.getItem("licenseKey");
    return license === VALID_LICENSE;
  }
  return false;
}
