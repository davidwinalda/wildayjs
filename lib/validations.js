class Validations {
  static presence(field, options = {}) {
    return {
      presence: true,
      message: options.message || `${field} cannot be blank`,
    };
  }

  static uniqueness(field, options = {}) {
    return {
      uniqueness: true,
      message: options.message || `${field} must be unique`,
    };
  }

  static length(field, options = {}) {
    return {
      length: {
        minimum: options.minimum,
        maximum: options.maximum,
      },
      message: options.message || this._generateLengthMessage(field, options),
    };
  }

  static format(field, options = {}) {
    return {
      format: options.pattern,
      message: options.message || `${field} format is invalid`,
    };
  }

  static numericality(field, options = {}) {
    return {
      numericality: true,
      minimum: options.minimum,
      maximum: options.maximum,
      onlyInteger: options.onlyInteger || false,
      message:
        options.message || this._generateNumericalityMessage(field, options),
    };
  }

  static _generateLengthMessage(field, { minimum, maximum }) {
    if (minimum && maximum) {
      return `${field} length must be between ${minimum} and ${maximum} characters`;
    }
    if (minimum) {
      return `${field} length must be at least ${minimum} characters`;
    }
    if (maximum) {
      return `${field} length must be at most ${maximum} characters`;
    }
    return `${field} length is invalid`;
  }

  static _generateNumericalityMessage(
    field,
    { minimum, maximum, onlyInteger }
  ) {
    let message = [];

    if (onlyInteger) {
      message.push("must be an integer");
    }

    if (minimum !== undefined && maximum !== undefined) {
      message.push(`must be between ${minimum} and ${maximum}`);
    } else if (minimum !== undefined) {
      message.push(`must be greater than or equal to ${minimum}`);
    } else if (maximum !== undefined) {
      message.push(`must be less than or equal to ${maximum}`);
    }

    return `${field} ${message.join(" and ")}`;
  }
}

module.exports = Validations;
