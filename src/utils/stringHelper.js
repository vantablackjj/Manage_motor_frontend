/**
 * Capitalizes the first letter of each word in a string (Title Case).
 * Useful for person names and addresses.
 * @param {string} str 
 * @returns {string}
 */
export const capitalizeName = (str) => {
    if (!str) return '';
    return str
      .toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
};

/**
 * Upper cases a string. Useful for license plates, engine numbers etc.
 * @param {string} str 
 * @returns {string}
 */
export const upperCaseString = (str) => {
    if (!str) return '';
    return str.toUpperCase();
};
