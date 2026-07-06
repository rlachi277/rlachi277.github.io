import path from "path";
import fs from 'fs';
import ejs from "ejs";
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

  "posts/post": "posts/entries/post",
  "posts/style": "posts/entries/style",
  "cycelog/log1": "cycelog/entries/log1",
  "cycelog/log3": "cycelog/entries/log3",
  "cycelog/log1_style": "cycelog/entries/log1_style",
  "cycelog/log3_style": "cycelog/entries/log3_style",

  "kimclweb/notfont/entry": "kimclweb/notfont/entries/entry",
  "kimclweb/gallery/entry": "kimclweb/gallery/entries/entry",
  "kimclweb/dobby-timer/entry": "kimclweb/dobby-timer/entries/entry",
} satisfies Record<string, string>;

type HtmlTemplate = true | {
  template?: string,
  templateParameters?: Record<string,string>,
  chunks?: (keyof typeof entries)[]
};

const html: Record<string, HtmlTemplate> = {
  "index": {chunks: ["index"]},

  "posts/index": {template: "posts/index.ejs", chunks: ["posts/post", "posts/style"]},
  "posts/post": {
    template: "posts/post.ejs",
    templateParameters: {title: "끾웹 글쓰기", rootclass: ""},
    chunks: ["posts/post", "posts/style"]
  },
  "posts/404": {
    template: "posts/post.ejs",
    templateParameters: {title: "끾웹 글쓰기(404)", rootclass: "notfound"},
    chunks: ["posts/post", "posts/style"]
  },
  "cycelog/log1_index": {template: "cycelog/log1_index.ejs", chunks: ["cycelog/log1", "posts/style"]},
  "cycelog/log1": {template: "cycelog/log1.ejs", chunks: ["cycelog/log1", "cycelog/log1_style"]},
  "cycelog/log1_404": {
    template: "posts/post.ejs",
    templateParameters: {title: "끾기록: 1차 기록(404)", rootclass: "notfound"},
    chunks: ["cycelog/log1", "posts/style"]
  },
  "cycelog/log3_index": {template: "cycelog/log3_index.ejs", chunks: ["cycelog/log3", "posts/style"]},
  "cycelog/log3": {template: "cycelog/log3.ejs", chunks: ["cycelog/log3", "cycelog/log3_style"]},
  "cycelog/log3_404": {
    template: "posts/post.ejs",
    templateParameters: {title: "끾기록: 3차 기록(404)", rootclass: "notfound"},
    chunks: ["cycelog/log3", "posts/style"]
  },

  "kimclweb/index": true,
  "kimclweb/notfont/index": {chunks: ["kimclweb/notfont/entry"]},
  ...[
    "kimclweb/gallery/index",
    "kimclweb/gallery/dobby_topic",
    "kimclweb/gallery/newcolors",
    "kimclweb/gallery/newnewcolors",
    "kimclweb/gallery/infolevel",
    "kimclweb/gallery/read_mode_test",
    "kimclweb/gallery/oklch-gradient/index",
    "kimclweb/gallery/oklch-gradient/icon"
  ].reduce((acc: Record<string, HtmlTemplate>, name) => {
    acc[name] = {chunks: ["kimclweb/gallery/entry"]};
    return acc;
  }, {}),
  ...[
    "kimclweb/gallery/oklch-gradient/a",
    "kimclweb/gallery/oklch-gradient/a copy",
    "kimclweb/gallery/oklch-gradient/b",
    "kimclweb/gallery/oklch-gradient/b copy",
    "kimclweb/gallery/oklch-gradient/c"
  ].reduce((acc: Record<string, HtmlTemplate>, name) => {
    acc[name] = true;
    return acc;
  }, {}),
  "kimclweb/dobby-timer/index": {chunks: ["kimclweb/dobby-timer/entry"]},
  "kimclweb/yet-another-timer/index": true,

  "kimclweb/archive/index": {chunks: ["kimclweb/gallery/entry"]},
  ...[
    "kimclweb/archive/brick-timer/index",
    "kimclweb/archive/brick-timer/timer",
    "kimclweb/archive/goodjobness/index",
    "kimclweb/archive/lstimer/v1",
    "kimclweb/archive/lstimer/v2",
    "kimclweb/archive/lstimer/v3",
    "kimclweb/archive/mc-color-converter/index",
    "kimclweb/archive/midnight-countdown/index",
    "kimclweb/archive/time-manager/index",
    "kimclweb/archive/time-manager/statics",
    "kimclweb/archive/time-manager/time",
    "kimclweb/archive/traffic-sign-recorder/index",
  ].reduce((acc: Record<string, HtmlTemplate>, name) => {
    acc[name] = true;
    return acc;
  }, {}),
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
      {
        test: /\.png,\.svg,\.jpe?g/,
        type: 'asset/resource',
      }
    ],
  },
  plugins: [
    new MiniCssExtractPlugin({
      filename: "[name].css"
    }),
    ...Object.entries(html).reduce((acc: HTMLWebpackPlugin[], [k, v]) => {
      if (v === true) v = {};
      const v2 = {
        template: v.template ?? `${k}.html`,
        templateParameters: v.templateParameters,
        chunks: v.chunks ?? []
      };
      const template = path.resolve(__dirname, "src/client", v2.template);
      acc.push(new HTMLWebpackPlugin({
        templateContent: v2.template.endsWith(".ejs") ?
          () => ejs.render(fs.readFileSync(template, "utf8"), v2.templateParameters ?? {}) :
          false,
        template: v2.template.endsWith(".ejs") ? '' : template,
        templateParameters: v.templateParameters ?? false,
        filename: `../template/${k}.ejs`,
        publicPath: "/public/",
        scriptLoading: "module",
        chunks: v2.chunks
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
