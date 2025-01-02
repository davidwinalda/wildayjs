# WildayJS

A Full-Stack JavaScript Web Framework Inspired by Ruby on Rails. If you love Ruby on Rails, you will feel familiar with WildayJS.

If you never use Ruby on Rails, you will love WildayJS.

## Overview

WildayJS is designed to make web development in Node.js simple and enjoyable. Following the principles of convention over configuration, it provides a robust foundation for building web applications with minimal setup.

## Installation

```bash
npm install -g wildayjs
```
## Quick Start

```bash
# Create a new WildayJS application
  $ wildayjs new my-app
  $ cd my-app
  $ npm install
  $ npm start
```

Then open http://localhost:3000 in your browser.

Generate a new controller:


```bash
  # posts controller
  $ wildayjs generate:controller posts
  $ wildayjs generate:controller posts index show
  $ wildayjs generate:controller posts index show --api
  $ wildayjs generate:controller admin/posts index

  # users controller
  $ wildayjs generate:controller users index show
```

Then try:
```bash
  $ wildayjs db:init
  $ wildayjs generate:model user name:string email:string
  $ wildayjs db:migrate
```

If you need to generate model with associations and validations:
```bash
  $ wildayjs generate:model user name:string email:string:null:false:unique
  $ wildayjs generate:model post title:string body:text user:references
```

Creating a new user:
```bash
  $ wildayjs console
  > const user = new User({ name: "John Doe", email: "john@example.com" });
  > user.save();
  > user.all();
```

If you need add new columns to a table:
```bash
  $ wildayjs generate:migration AddUsernameToUsers username:string
  $ wildayjs db:migrate
```

Check the data through the API endpoints:
```bash
  GET    /api/users
  GET    /api/users/:id
  POST   /api/users
  PUT    /api/users/:id
  DELETE /api/users/:id
```

## Features

- MVC Architecture
  - Models: Data handling with validations and associations
  - Views: Template rendering with layout support
  - Controllers: Request handling and response management
- Database Integration
  - Built-in SQLite, MySQL, and PostgreSQL support
  - Simple migration system
  - Model associations
  - Intuitive query interface with ORM
- Routing System
  - Convention-based routing
  - RESTful resources
  - Nested routes support
  - Parameter handling
- WildayJS CLI
  - Generate models, controllers, and views
  - Generate migrations
  - Generate seeds
- WildayJS Console
  - Interactive console for testing and debugging
  - Execute SQL queries
  - View and manage database tables
  - Execute JavaScript code

## Project Structure

```
my-app/
├── app/
│   ├── controllers/
│   ├── models/
│   └── views/
├── config/
│   ├── application.js
│   ├── routes.js
│   └── server.js
├── db/
│   └── migrations/
├── public/
└── package.json
```

Note: WildayJS is under active development. Feel free to report issues or suggest features on our GitHub repository. Will publish the first version soon and give the demo what apps can be built with WildayJS. 🚀
