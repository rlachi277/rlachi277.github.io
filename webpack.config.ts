import path from "path";
import { fileURLToPath } from "url";
import webpack from "webpack";
import MiniCssExtractPlugin from "mini-css-extract-plugin";
import CssMinimizerPlugin from "css-minimizer-webpack-plugin";

// in case you run into any TypeScript error when configuring `devServer`
// import "webpack-dev-server";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const config: webpack.Configuration = {
  mode: "production",
  target: ["web", "es2022"],
  entry: {
    "posts/index": "./client/posts/entries/index.ts",
    "posts/post": "./client/posts/entries/post.ts",
    "cycelog/log1_index": "./client/cycelog/entries/log1_index.ts",
    "cycelog/log1": "./client/cycelog/entries/log1.ts",
    "cycelog/log3_index": "./client/cycelog/entries/log3_index.ts",
    "cycelog/log3": "./client/cycelog/entries/log3.ts"
  },
  module: {
    rules: [
      {
        test: /\.css$/i,
        use: [MiniCssExtractPlugin.loader, "css-loader"]
      },
      {
        test: /\.tsx?$/i,
        loader: "ts-loader",
        options: {
          configFile: path.resolve(__dirname, "tsconfig.client.json"),
          context: __dirname
        },
        exclude: /node_modules/,
      },
    ],
  },
  plugins: [
    new MiniCssExtractPlugin({
      filename: "[name].css"
    })
  ],
  optimization: {
    minimizer: [
      "...",
      new CssMinimizerPlugin()
    ]
  },
  output: {
    path: path.resolve(__dirname, "client/bundles"),
    filename: "[name].js",
    clean: true
  },
  resolve: {
    extensions: [".tsx", ".ts", ".js"],
    extensionAlias: {
      ".js": [".tsx", ".ts", ".js"]
    }
  },
};

export default config;
