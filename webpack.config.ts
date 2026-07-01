import path from "path";
import { fileURLToPath } from "url";
import webpack from "webpack";
import MiniCssExtractPlugin from "mini-css-extract-plugin";
import CssMinimizerPlugin from "css-minimizer-webpack-plugin";
import HTMLWebpackPlugin from "html-webpack-plugin";

// in case you run into any TypeScript error when configuring `devServer`
// import "webpack-dev-server";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const config: webpack.Configuration = {
  mode: "production",
  target: ["web", "es2022"],
  entry: {
    "index": "./src/index.ts",
    "posts/index": "./src/posts/entries/index.ts",
    "posts/post": "./src/posts/entries/post.ts",
    "cycelog/log1_index": "./src/cycelog/entries/log1_index.ts",
    "cycelog/log1": "./src/cycelog/entries/log1.ts",
    "cycelog/log3_index": "./src/cycelog/entries/log3_index.ts",
    "cycelog/log3": "./src/cycelog/entries/log3.ts"
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
    }),
    ...getHtmlPlugin({
      "index": "index",
      "posts/index": "posts/index",
      "posts/post": "posts/post",
      "posts/404": "posts/post",
      "cycelog/log1_index": "cycelog/log1_index",
      "cycelog/log1": "cycelog/log1",
      "cycelog/log1_404": "cycelog/log1",
      "cycelog/log3_index": "cycelog/log3_index",
      "cycelog/log3": "cycelog/log3",
      "cycelog/log3_404": "cycelog/log3"
    })
  ],
  optimization: {
    minimizer: [
      "...",
      new CssMinimizerPlugin()
    ]
  },
  output: {
    path: path.resolve(__dirname, "dist"),
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

function getHtmlPlugin(files: Record<string,string>): HTMLWebpackPlugin[] {
  const result: HTMLWebpackPlugin[] = [];
  for (const [k, v] of Object.entries(files)) {
    result.push(new HTMLWebpackPlugin({
      template: `src/${k}.html`,
      filename: `${k}.html`,
      publicPath: "/dist/",
      scriptLoading: "module",
      chunks: [v]
    }))
  }
  return result;
}

export default config;
