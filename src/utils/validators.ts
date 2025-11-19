export const validateContact = (contact: string): boolean => {
  console.log("Contact number in validator: ", contact);
  const mobileRegex = /^[6-9]\d{9}$/;
  return mobileRegex.test(contact);
};

export const validateOTP = (otp: string): boolean => {
  const otpRegex = /^\d{6}$/;
  return otpRegex.test(otp);
};

export const validateName = (name: string): boolean => {
  return name.trim().length >= 2;
};

export const validateMPIN = (mpin: string): boolean => {
  const mpinRegex = /^\d{4}$/;
  return mpinRegex.test(mpin);
};
