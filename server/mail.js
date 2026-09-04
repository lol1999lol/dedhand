import { connect } from "node:net";
import { connect as tlsConnect } from "node:tls";
import { readFile } from "node:fs/promises";
import { basename } from "node:path";

export async function createTransport(config) {
  return {
    async send({ from, to, subject, text, attachments = [] }) {
      const port = Number(config.port || 587);
      const secure = Boolean(config.secure) || port === 465;
      const socket = await openSocket(config.host, port, secure);
      const talk = makeTalk(socket);
      await talk.expect(220);
      await talk.cmd(`EHLO dedhand.local`, 250);
      if (!secure && port === 587) {
        await talk.cmd("STARTTLS", 220);
        socket = await upgradeTls(socket, config.host);
        talk.swap(socket);
        await talk.cmd(`EHLO dedhand.local`, 250);
      }
      if (config.user) {
        await talk.cmd("AUTH LOGIN", 334);
        await talk.cmd(Buffer.from(config.user).toString("base64"), 334);
        await talk.cmd(Buffer.from(config.pass || "").toString("base64"), 235);
      }
      await talk.cmd(`MAIL FROM:<${from}>`, 250);
      for (const rcpt of String(to).split(",").map((s) => s.trim()).filter(Boolean)) {
        await talk.cmd(`RCPT TO:<${rcpt}>`, 250);
      }
      await talk.cmd("DATA", 354);
      const mime = await buildMime({ from, to, subject, text, attachments });
      socket.write(mime.replace(/\n/g, "\r\n") + "\r\n.\r\n");
      await talk.expect(250);
      await talk.cmd("QUIT", 221);
      socket.end();
    },
  };
}

function openSocket(host, port, secure) {
  return new Promise((resolve, reject) => {
    const sock = secure
      ? tlsConnect({ host, port, servername: host }, () => resolve(sock))
      : connect({ host, port }, () => resolve(sock));
    sock.setEncoding("utf8");
    sock.on("error", reject);
  });
}

function upgradeTls(socket, host) {
  return new Promise((resolve, reject) => {
    const tlsSock = tlsConnect({ socket, servername: host }, () => resolve(tlsSock));
    tlsSock.setEncoding("utf8");
    tlsSock.on("error", reject);
  });
}

function makeTalk(initial) {
  let socket = initial;
  let buffer = "";
  const waiters = [];
  const onData = (chunk) => {
    buffer += chunk;
    flush();
  };
  socket.on("data", onData);
  function flush() {
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() || "";
    for (const line of lines) {
      const waiter = waiters[0];
      if (!waiter) continue;
      if (/^\d{3}[ -]/.test(line) && line[3] !== "-") {
        waiters.shift();
        const code = Number(line.slice(0, 3));
        if (code === waiter.code || (Array.isArray(waiter.code) && waiter.code.includes(code))) {
          waiter.resolve(line);
        } else {
          waiter.reject(new Error(line));
        }
      }
    }
  }
  return {
    swap(next) {
      socket.off("data", onData);
      socket = next;
      socket.on("data", onData);
    },
    expect(code) {
      return new Promise((resolve, reject) => {
        waiters.push({ code, resolve, reject });
        flush();
      });
    },
    async cmd(line, code) {
      socket.write(line + "\r\n");
      return this.expect(code);
    },
  };
}

async function buildMime({ from, to, subject, text, attachments }) {
  const boundary = `dedhand_${Date.now()}`;
  const headers = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${subject}`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
  ];
  const parts = [
    `--${boundary}`,
    "Content-Type: text/plain; charset=utf-8",
    "",
    text,
  ];
  for (const file of attachments) {
    const data = await readFile(file.path);
    parts.push(
      `--${boundary}`,
      `Content-Type: application/zip; name="${file.filename || basename(file.path)}"`,
      "Content-Transfer-Encoding: base64",
      `Content-Disposition: attachment; filename="${file.filename || basename(file.path)}"`,
      "",
      data.toString("base64").replace(/(.{76})/g, "$1\n")
    );
  }
  parts.push(`--${boundary}--`, "");
  return `${headers.join("\n")}\n\n${parts.join("\n")}`;
}
