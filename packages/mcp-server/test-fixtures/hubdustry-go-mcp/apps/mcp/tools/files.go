// FIXTURE: minimal Go for adapter testing — not real code
// Three mcp.NewTool("server.files.{list,read,write}") calls so the
// hubdustry-go-mcp adapter's regex picks up exactly three names.
package tools

import "example.com/hubdustry/mcp"

func RegisterFileTools() {
	_ = mcp.NewTool("server.files.list", mcp.WithDescription("List files in a server directory"))
	_ = mcp.NewTool("server.files.read", mcp.WithDescription("Read a file from the server"))
	_ = mcp.NewTool("server.files.write", mcp.WithDescription("Write a file to the server"))
}
