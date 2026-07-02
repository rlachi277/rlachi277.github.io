import path from "path";
import { fileURLToPath } from "url";
import webpack from "webpack";
import MiniCssExtractPlugin from "mini-css-extract-plugin";
import CssMinimizerPlugin from "css-minimizer-webpack-plugin";
import HTMLWebpackPlugin from "html-webpack-plugin";

// in case you run into any TypeScript error when configuring `devServer` // THIS IS NOT AI this was copy-pasted from https://webpack.js.org/guides/typescript/
// import "webpack-dev-server";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const entries = {
  "index": "index",
  "posts/index": "posts/entries/index",
  "posts/post": "posts/entries/post",
  "cycelog/log1_index": "cycelog/entries/log1_index",
  "cycelog/log1": "cycelog/entries/log1",
  "cycelog/log3_index": "cycelog/entries/log3_index",
  "cycelog/log3": "cycelog/entries/log3"
} as const;

const html: Record<string, keyof typeof entries> = {
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
};

const config: webpack.Configuration = {
  mode: "production",
  target: ["web", "es2022"],
  entry: Object.entries(entries).reduce((acc: Record<string,string>, [k, v]) => {
    acc[k] = `./src/client/${v}.ts`;
    return acc;
  }, {}),
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
    ...Object.entries(html).reduce((acc: HTMLWebpackPlugin[], [k, v]) => {
      acc.push(new HTMLWebpackPlugin({
        template: `src/client/${k}.html`,
        filename: `../template/${k}.html`,
        publicPath: "/public/",
        scriptLoading: "module",
        chunks: [v]
      }));
      return acc;
    }, [])
  ],
  optimization: {
    splitChunks: {chunks: "all"},
    minimizer: [
      "...",
      new CssMinimizerPlugin()
    ]
  },
  output: {
    path: path.resolve(__dirname, "dist", "public"),
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
