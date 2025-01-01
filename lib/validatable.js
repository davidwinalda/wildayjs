class Validatable {
  static validations = {};

  static validates(field, rules) {
    // Initialize validations for this class if not exists
    if (!this.validations[this.name]) {
      this.validations[this.name] = {};
    }

    // Initialize validations for this field if not exists
    if (!this.validations[this.name][field]) {
      this.validations[this.name][field] = [];
    }

    // Add the validation rules
    this.validations[this.name][field].push(rules);
  }

  validate() {
    const errors = [];
    const modelValidations =
      this.constructor.validations[this.constructor.name] || {};

    console.log("Running validations for:", this.constructor.name);
    console.log("Available validations:", modelValidations);

    for (const [field, rules] of Object.entries(modelValidations)) {
      rules.forEach((rule) => {
        const error = this._runValidation(field, rule);
        if (error) errors.push(error);
      });
    }

    return errors;
  }

  _runValidation(field, rule) {
    const value = this[field];

    // Presence validation
    if (rule.presence && !value) {
      return rule.message || `${field} cannot be blank`;
    }

    // Skip other validations if value is null/undefined
    if (value === null || value === undefined) {
      return null;
    }

    // Uniqueness validation
    if (rule.uniqueness) {
      const existing = this.constructor.findBy({ [field]: value });
      if (existing && existing.id !== this.id) {
        return rule.message || `${field} must be unique`;
      }
    }

    // Length validation
    if (rule.length) {
      const { minimum, maximum } = rule.length;
      const length = value.toString().length;

      if (minimum && length < minimum) {
        return `${field} is too short (minimum is ${minimum} characters)`;
      }

      if (maximum && length > maximum) {
        return `${field} is too long (maximum is ${maximum} characters)`;
      }
    }

    // Format validation
    if (rule.format && !rule.format.test(value.toString())) {
      return rule.message;
    }

    // Numericality validation
    if (rule.numericality) {
      const num = Number(value);

      if (isNaN(num)) {
        return `${field} is not a number`;
      }

      if (rule.onlyInteger && !Number.isInteger(num)) {
        return `${field} must be an integer`;
      }

      if (rule.minimum !== undefined && num < rule.minimum) {
        return `${field} must be greater than or equal to ${rule.minimum}`;
      }

      if (rule.maximum !== undefined && num > rule.maximum) {
        return `${field} must be less than or equal to ${rule.maximum}`;
      }
    }

    return null;
  }
}

// Ensure the static method is properly defined
Object.defineProperty(Validatable, "validates", {
  enumerable: true,
  writable: true,
  configurable: true,
});

module.exports = Validatable;
