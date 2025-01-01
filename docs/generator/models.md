# Model Generator

The WildayJS Model Generator helps you create model files with predefined attributes and relationships.

## Usage

```bash
wildayjs generate model <ModelName> [attributes]
```

## Examples

### Basic Model Generation

```bash
wildayjs generate model user name:string email:string
```

This will create:
- `app/models/user.js` - The model file
- `db/migrations/YYYYMMDDHHMMSS_create_users.sql` - A migration file

### Available Data Types

- `string`: String data type
- `text`: Text data type for longer strings
- `integer`: Integer numbers
- `float`: Decimal numbers
- `decimal`: Precise decimal numbers
- `datetime`: Date and time
- `date`: Date only
- `time`: Time only
- `boolean`: True/false values
- `json`: JSON data type
- `array`: Array data type

### Adding Relationships

```bash
# Has many relationship
wildayjs generate model post title:string content:text user:references

# Belongs to relationship
wildayjs generate model comment content:text post:belongs_to
```

### Options

- `--no-migration`: Generate only the model file without migration
- `--timestamps`: Add created_at and updated_at fields (added by default)
- `--force`: Overwrite existing files

## Generated Files

### Model File Structure

```javascript
// app/models/post.js
class Post extends Model {
  static initializeAssociations() {
    this.belongsTo("user", "user_id");
  }

  static initializeValidations() {
    console.log("Initializing Post validations");

    this.validates(
      "title",
      Validations.length("title", {
        minimum: 3,
        maximum: 255,
        message: "title must be between 3 and 255 characters"
      })
    );
    this.validates(
      "user_id",
      Validations.presence("user_id", {
        message: "Post must belong to a user"
      })
    );

    console.log("Post validations:", this.validations[this.name]);
  }
}

module.exports = Post;

```

### Migration File Structure

```sql
-- db/migrations/YYYYMMDDHHMMSS_create_posts.sql
CREATE TABLE posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  content TEXT,
  user_id INTEGER NOT NULL,
  created_at DATETIME DEFAULT (datetime('now')),
  updated_at DATETIME DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users (id)
);
``` 